import { LAUNCH, ORBIT } from '@/game/config/balance';
import type { Vector2 } from '@/game/types';

/**
 * Free flight after release.
 *
 * The base motion is a straight line at constant speed — the most predictable
 * thing possible, which is what a precision game needs. On top of that sits a
 * strictly bounded steering assist that only nudges the orb towards a target it
 * is already nearly going to hit, so it rescues frame-timing jitter without
 * ever aiming for the player.
 */

export interface FlightState {
  position: Vector2;
  velocity: Vector2;
  /** Seconds since release. */
  elapsed: number;
  /** Immunity window preventing instant re-capture by the core we just left. */
  graceRemaining: number;
  /** Extra multiplier applied by boost zones. */
  speedMultiplier: number;
  /** Lateral acceleration applied by gravity zones, in px/s². */
  externalAccelerationX: number;
  externalAccelerationY: number;
}

export interface AssistTarget {
  center: Vector2;
  captureRadius: number;
}

export class LaunchSystem {
  private state: FlightState | null = null;
  private assistEnabled = true;

  setAssistEnabled(enabled: boolean): void {
    this.assistEnabled = enabled;
  }

  /** Releases the orb along `direction` at `speed`. */
  launch(position: Vector2, direction: Vector2, speed: number): FlightState {
    const length = Math.hypot(direction.x, direction.y) || 1;
    this.state = {
      position: { x: position.x, y: position.y },
      velocity: { x: (direction.x / length) * speed, y: (direction.y / length) * speed },
      elapsed: 0,
      graceRemaining: ORBIT.releaseGrace,
      speedMultiplier: 1,
      externalAccelerationX: 0,
      externalAccelerationY: 0,
    };
    return this.state;
  }

  stop(): void {
    this.state = null;
  }

  get current(): FlightState | null {
    return this.state;
  }

  get isFlying(): boolean {
    return this.state !== null;
  }

  applyBoost(multiplier: number): void {
    if (this.state) this.state.speedMultiplier = multiplier;
  }

  clearBoost(): void {
    if (this.state) this.state.speedMultiplier = 1;
  }

  applyExternalAcceleration(x: number, y: number): void {
    if (!this.state) return;
    this.state.externalAccelerationX = x;
    this.state.externalAccelerationY = y;
  }

  teleport(destination: Vector2): void {
    if (!this.state) return;
    this.state.position.x = destination.x;
    this.state.position.y = destination.y;
  }

  /** Advances the flight by `deltaSeconds` and returns the new position. */
  advance(deltaSeconds: number, assistTarget: AssistTarget | null): Vector2 | null {
    const state = this.state;
    if (!state) return null;

    state.elapsed += deltaSeconds;
    state.graceRemaining = Math.max(0, state.graceRemaining - deltaSeconds);

    state.velocity.x += state.externalAccelerationX * deltaSeconds;
    state.velocity.y += state.externalAccelerationY * deltaSeconds;

    if (this.assistEnabled && assistTarget) {
      this.applyAssist(state, assistTarget, deltaSeconds);
    }

    const scale = state.speedMultiplier * deltaSeconds;
    state.position.x += state.velocity.x * scale;
    state.position.y += state.velocity.y * scale;
    return state.position;
  }

  /**
   * Rotates the velocity slightly towards the target's capture ring.
   *
   * Bounded three ways: it only engages close to the target, the correction is
   * proportional to how nearly-correct the trajectory already is, and the total
   * acceleration is capped by `LAUNCH.assistAcceleration`.
   */
  private applyAssist(state: FlightState, target: AssistTarget, deltaSeconds: number): void {
    const dx = target.center.x - state.position.x;
    const dy = target.center.y - state.position.y;
    const distance = Math.hypot(dx, dy);
    const engageDistance = target.captureRadius * LAUNCH.assistEngageFactor;
    if (distance > engageDistance || distance < 1) return;

    const speed = Math.hypot(state.velocity.x, state.velocity.y) || 1;
    const dirX = state.velocity.x / speed;
    const dirY = state.velocity.y / speed;

    // Perpendicular offset: how far off the current heading the target sits.
    const lateral = dx * -dirY + dy * dirX;
    const forward = dx * dirX + dy * dirY;
    if (forward <= 0) return;

    const missRatio = Math.abs(lateral) / target.captureRadius;
    // Already inside the ring, or hopelessly off — assist does nothing.
    if (missRatio < 0.15 || missRatio > 1.6) return;

    const proximity = 1 - distance / engageDistance;
    const magnitude = LAUNCH.assistAcceleration * proximity * Math.sign(lateral);
    state.velocity.x += -dirY * magnitude * deltaSeconds;
    state.velocity.y += dirX * magnitude * deltaSeconds;

    // Re-normalise so assist changes heading, never speed.
    const newSpeed = Math.hypot(state.velocity.x, state.velocity.y) || 1;
    state.velocity.x = (state.velocity.x / newSpeed) * speed;
    state.velocity.y = (state.velocity.y / newSpeed) * speed;
  }

  get exceededMaxFlightTime(): boolean {
    return (this.state?.elapsed ?? 0) > LAUNCH.maxFlightTime;
  }
}
