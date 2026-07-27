import { ORBIT, clamp } from '@/game/config/balance';
import { TWO_PI, normalizeAngle, pointOnCircle, tangentAt } from '@/game/physics/orbitMath';
import type { SpinDirection, Vector2 } from '@/game/types';

/**
 * Tracks the orb while it is attached to a core.
 *
 * Pure state + maths: it knows an angle, a radius and a spin, and nothing about
 * rendering. `advance` is delta-time driven so the motion is frame-rate
 * independent on a 60 Hz phone and a 144 Hz monitor alike.
 */
export interface OrbitState {
  center: Vector2;
  radius: number;
  angle: number;
  spin: SpinDirection;
  angularSpeed: number;
  /** Seconds spent on the current orbit. */
  elapsed: number;
}

export class OrbitSystem {
  private state: OrbitState | null = null;
  /** Radius tween used to make a capture snap feel smooth rather than abrupt. */
  private radiusFrom = 0;
  private radiusTo = 0;
  private radiusBlend = 1;

  private static readonly RADIUS_BLEND_SECONDS = 0.14;

  /** Attaches the orb to a core at the angle it arrived from. */
  attach(options: {
    center: Vector2;
    approachPoint: Vector2;
    targetRadius: number;
    spin: SpinDirection;
    angularSpeed: number;
  }): OrbitState {
    const angle = Math.atan2(
      options.approachPoint.y - options.center.y,
      options.approachPoint.x - options.center.x,
    );
    const approachRadius = Math.hypot(
      options.approachPoint.x - options.center.x,
      options.approachPoint.y - options.center.y,
    );

    this.radiusFrom = clamp(approachRadius, ORBIT.minRadius * 0.5, ORBIT.maxRadius * 2);
    this.radiusTo = options.targetRadius;
    this.radiusBlend = 0;

    this.state = {
      center: { x: options.center.x, y: options.center.y },
      radius: this.radiusFrom,
      angle: normalizeAngle(angle),
      spin: options.spin,
      angularSpeed: options.angularSpeed,
      elapsed: 0,
    };
    return this.state;
  }

  detach(): void {
    this.state = null;
  }

  get current(): OrbitState | null {
    return this.state;
  }

  get isAttached(): boolean {
    return this.state !== null;
  }

  /** Keeps the orbit centred on a moving core. */
  syncCenter(center: Vector2, radius: number): void {
    if (!this.state) return;
    this.state.center.x = center.x;
    this.state.center.y = center.y;
    // Pulsing cores change their radius; follow it once the snap has settled.
    if (this.radiusBlend >= 1) this.radiusTo = radius;
  }

  advance(deltaSeconds: number): Vector2 | null {
    const state = this.state;
    if (!state) return null;

    state.elapsed += deltaSeconds;
    state.angle = normalizeAngle(state.angle + state.spin * state.angularSpeed * deltaSeconds);

    if (this.radiusBlend < 1) {
      this.radiusBlend = Math.min(
        1,
        this.radiusBlend + deltaSeconds / OrbitSystem.RADIUS_BLEND_SECONDS,
      );
      // Smoothstep keeps the snap from looking mechanical.
      const t = this.radiusBlend * this.radiusBlend * (3 - 2 * this.radiusBlend);
      state.radius = this.radiusFrom + (this.radiusTo - this.radiusFrom) * t;
    } else {
      state.radius = this.radiusTo;
    }

    return pointOnCircle(state.center, state.radius, state.angle);
  }

  /** Position the orb occupies right now, without advancing time. */
  get position(): Vector2 | null {
    if (!this.state) return null;
    return pointOnCircle(this.state.center, this.state.radius, this.state.angle);
  }

  /** Unit direction the orb would travel if released this instant. */
  get releaseDirection(): Vector2 | null {
    if (!this.state) return null;
    return tangentAt(this.state.angle, this.state.spin);
  }

  /** True once the orb has been on this orbit longer than the safety limit. */
  get exceededMaxOrbitTime(): boolean {
    return (this.state?.elapsed ?? 0) > ORBIT.maxOrbitTime;
  }

  /** Fraction of a full revolution completed, for tutorial prompts. */
  get revolutions(): number {
    if (!this.state) return 0;
    return (this.state.angularSpeed * this.state.elapsed) / TWO_PI;
  }
}
