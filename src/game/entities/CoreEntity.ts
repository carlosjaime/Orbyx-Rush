import * as Phaser from 'phaser';
import { ORBIT } from '@/game/config/balance';
import { TEXTURE_KEYS } from '@/game/effects/textures';
import type { CoreSpec, Vector2 } from '@/game/types';

/**
 * A gravitational core: the thing the orb circles and the thing it aims for.
 *
 * Reads its behaviour entirely from the immutable `CoreSpec` produced by the
 * level generator, so a core rendered here is exactly the core the reachability
 * prover validated.
 */
export class CoreEntity {
  readonly spec: CoreSpec;
  /** Live centre, which differs from `spec` for moving cores. */
  readonly position: Vector2;
  /** Live orbit radius, which breathes for pulsing cores. */
  orbitRadius: number;

  private readonly scene: Phaser.Scene;
  private readonly bodySprite: Phaser.GameObjects.Image;
  private readonly captureRing: Phaser.GameObjects.Image;
  private readonly orbitRing: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly spinIndicator: Phaser.GameObjects.Graphics;

  private elapsed = 0;
  private collapsed = false;
  private visited = false;

  constructor(scene: Phaser.Scene, spec: CoreSpec, colors: CoreColors, depth: number) {
    this.scene = scene;
    this.spec = spec;
    this.position = { x: spec.x, y: spec.y };
    this.orbitRadius = spec.orbitRadius;

    const captureRadius = spec.orbitRadius * ORBIT.captureRadiusFactor;

    this.glow = scene.add
      .image(spec.x, spec.y, TEXTURE_KEYS.glow)
      .setDepth(depth - 2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(captureRadius * 3.2, captureRadius * 3.2)
      .setAlpha(0.28)
      .setTint(colors.glow);

    this.captureRing = scene.add
      .image(spec.x, spec.y, TEXTURE_KEYS.ring)
      .setDepth(depth - 1)
      .setDisplaySize(captureRadius * 2, captureRadius * 2)
      .setAlpha(0.22)
      .setTint(colors.capture);

    this.orbitRing = scene.add
      .image(spec.x, spec.y, TEXTURE_KEYS.ring)
      .setDepth(depth)
      .setDisplaySize(spec.orbitRadius * 2, spec.orbitRadius * 2)
      .setAlpha(0.4)
      .setTint(colors.orbit);

    this.bodySprite = scene.add
      .image(spec.x, spec.y, TEXTURE_KEYS.coreCore)
      .setDepth(depth + 1)
      .setDisplaySize(46, 46)
      .setTint(colors.body);

    // Direction is signalled by a rotating arc, not by colour alone — this is
    // the accessibility requirement that state never depends only on hue.
    this.spinIndicator = scene.add.graphics().setDepth(depth + 2);
    this.drawSpinIndicator(colors.orbit);

    if (spec.kind === 'decoy') {
      this.bodySprite.setAlpha(0.75);
      scene.tweens.add({
        targets: this.bodySprite,
        alpha: { from: 0.75, to: 0.35 },
        duration: 480,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  private drawSpinIndicator(color: number): void {
    const g = this.spinIndicator;
    g.clear();
    g.lineStyle(5, color, 0.85);
    const radius = 34;
    const start = 0;
    const sweep = Math.PI * 0.55;
    g.beginPath();
    g.arc(0, 0, radius, start, start + sweep, this.spec.spin === -1);
    g.strokePath();
    // Arrow head marks the travel direction unambiguously.
    const tipAngle = this.spec.spin === 1 ? start + sweep : start;
    const tipX = Math.cos(tipAngle) * radius;
    const tipY = Math.sin(tipAngle) * radius;
    g.fillStyle(color, 0.9);
    g.fillCircle(tipX, tipY, 6);
  }

  get captureRadius(): number {
    return this.orbitRadius * ORBIT.captureRadiusFactor;
  }

  get isCollapsed(): boolean {
    return this.collapsed;
  }

  markVisited(): void {
    this.visited = true;
    this.captureRing.setAlpha(0.1);
    this.orbitRing.setAlpha(0.16);
    this.bodySprite.setAlpha(0.55);
  }

  get wasVisited(): boolean {
    return this.visited;
  }

  update(deltaSeconds: number): void {
    if (this.collapsed) return;
    this.elapsed += deltaSeconds;

    const motion = this.spec.motion;
    if (motion) {
      const offset =
        Math.sin((this.elapsed / motion.period) * Math.PI * 2 + motion.phase) * motion.amplitude;
      this.position.x = motion.axis === 'x' ? this.spec.x + offset : this.spec.x;
      this.position.y = motion.axis === 'y' ? this.spec.y + offset : this.spec.y;
    }

    const pulse = this.spec.pulse;
    if (pulse) {
      const factor =
        1 + Math.sin((this.elapsed / pulse.period) * Math.PI * 2 + pulse.phase) * pulse.amplitude;
      this.orbitRadius = this.spec.orbitRadius * factor;
      this.orbitRing.setDisplaySize(this.orbitRadius * 2, this.orbitRadius * 2);
      this.captureRing.setDisplaySize(this.captureRadius * 2, this.captureRadius * 2);
    }

    const { x, y } = this.position;
    this.glow.setPosition(x, y);
    this.captureRing.setPosition(x, y);
    this.orbitRing.setPosition(x, y);
    this.bodySprite.setPosition(x, y);
    this.spinIndicator.setPosition(x, y);
    this.spinIndicator.setRotation(this.elapsed * this.spec.spin * 1.4);
    this.bodySprite.setRotation(this.elapsed * this.spec.spin * 0.6);
  }

  /** Bright flash when the orb is captured. */
  playCapturePulse(perfect: boolean): void {
    const scale = perfect ? 1.5 : 1.25;
    this.scene.tweens.add({
      targets: [this.glow],
      alpha: { from: perfect ? 0.75 : 0.5, to: 0.28 },
      duration: perfect ? 420 : 280,
      ease: 'Cubic.Out',
    });
    this.scene.tweens.add({
      targets: [this.bodySprite],
      scale: { from: scale, to: 1 },
      duration: 320,
      ease: 'Back.Out',
    });
    this.scene.tweens.add({
      targets: [this.orbitRing],
      alpha: { from: 0.95, to: 0.4 },
      duration: 380,
      ease: 'Cubic.Out',
    });
  }

  /** Decoy cores collapse once the player leaves them. */
  collapse(): void {
    if (this.collapsed) return;
    this.collapsed = true;
    this.scene.tweens.add({
      targets: [this.bodySprite, this.orbitRing, this.captureRing, this.glow, this.spinIndicator],
      alpha: 0,
      scale: 0.2,
      duration: 260,
      ease: 'Cubic.In',
    });
  }

  /** Highlights the core the player should aim for next. */
  setTargeted(targeted: boolean): void {
    this.captureRing.setAlpha(targeted ? 0.55 : this.visited ? 0.1 : 0.22);
    this.orbitRing.setAlpha(targeted ? 0.7 : this.visited ? 0.16 : 0.4);
  }

  get bounds(): { x: number; y: number; radius: number } {
    return { x: this.position.x, y: this.position.y, radius: this.captureRadius };
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([
      this.bodySprite,
      this.orbitRing,
      this.captureRing,
      this.glow,
      this.spinIndicator,
    ]);
    this.bodySprite.destroy();
    this.orbitRing.destroy();
    this.captureRing.destroy();
    this.glow.destroy();
    this.spinIndicator.destroy();
  }
}

export interface CoreColors {
  body: number;
  orbit: number;
  capture: number;
  glow: number;
}
