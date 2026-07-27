import * as Phaser from 'phaser';
import { HAZARDS } from '@/game/config/balance';
import { TEXTURE_KEYS } from '@/game/effects/textures';
import type { HazardSpec, Vector2 } from '@/game/types';

/**
 * Rotating energy bars and pulsing laser beams.
 *
 * A laser is only lethal while `isLethal` is true; it always telegraphs itself
 * for `HAZARDS.laser.warmup` seconds first so a death is never a surprise.
 */
export class HazardEntity {
  readonly spec: HazardSpec;

  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private elapsed: number;
  private angle: number;
  private lethal = true;

  constructor(
    scene: Phaser.Scene,
    spec: HazardSpec,
    color: number,
    warnColor: number,
    depth: number,
  ) {
    this.scene = scene;
    this.spec = spec;
    this.angle = spec.angle;
    this.elapsed = spec.phase;

    this.glow = scene.add
      .image(spec.x, spec.y, TEXTURE_KEYS.hazardBar)
      .setDepth(depth - 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(spec.length * 1.05, spec.thickness * 3.4)
      .setRotation(spec.angle)
      .setAlpha(0.4)
      .setTint(color);

    this.sprite = scene.add
      .image(spec.x, spec.y, TEXTURE_KEYS.hazardBar)
      .setDepth(depth)
      .setDisplaySize(spec.length, spec.thickness)
      .setRotation(spec.angle)
      .setTint(spec.kind === 'laser' ? warnColor : color);
  }

  get isLethal(): boolean {
    return this.lethal;
  }

  /** Endpoints in world space, used for collision and near-miss checks. */
  get segment(): [Vector2, Vector2] {
    const half = this.spec.length / 2;
    const dx = Math.cos(this.angle) * half;
    const dy = Math.sin(this.angle) * half;
    return [
      { x: this.spec.x - dx, y: this.spec.y - dy },
      { x: this.spec.x + dx, y: this.spec.y + dy },
    ];
  }

  get thickness(): number {
    return this.spec.thickness;
  }

  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;

    if (this.spec.kind === 'bar') {
      this.angle += this.spec.spin * deltaSeconds;
      this.sprite.setRotation(this.angle);
      this.glow.setRotation(this.angle);
      return;
    }

    // Laser cycle: warmup (visible, harmless) -> on (lethal) -> off (hidden).
    const cycle = HAZARDS.laser.warmup + HAZARDS.laser.onDuration + HAZARDS.laser.offDuration;
    const t = this.elapsed % cycle;

    if (t < HAZARDS.laser.warmup) {
      this.lethal = false;
      const ratio = t / HAZARDS.laser.warmup;
      this.sprite.setAlpha(0.22 + ratio * 0.3);
      this.sprite.setDisplaySize(this.spec.length, this.spec.thickness * (0.25 + ratio * 0.45));
      this.glow.setAlpha(0.06 + ratio * 0.14);
    } else if (t < HAZARDS.laser.warmup + HAZARDS.laser.onDuration) {
      this.lethal = true;
      this.sprite.setAlpha(1);
      this.sprite.setDisplaySize(this.spec.length, this.spec.thickness);
      this.glow.setAlpha(0.45);
    } else {
      this.lethal = false;
      this.sprite.setAlpha(0.08);
      this.sprite.setDisplaySize(this.spec.length, this.spec.thickness * 0.2);
      this.glow.setAlpha(0.03);
    }
  }

  flashNearMiss(): void {
    this.scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.85, to: 0.4 },
      duration: 220,
      ease: 'Cubic.Out',
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.sprite, this.glow]);
    this.sprite.destroy();
    this.glow.destroy();
  }
}
