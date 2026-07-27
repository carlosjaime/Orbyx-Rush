import * as Phaser from 'phaser';
import { POWERUPS } from '@/game/config/balance';
import { TEXTURE_KEYS } from '@/game/effects/textures';
import type { FragmentSpec, Vector2 } from '@/game/types';

/** Energy fragments and shield pickups. */
export class PickupEntity {
  readonly spec: FragmentSpec;
  readonly position: Vector2;

  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private collected = false;

  constructor(scene: Phaser.Scene, spec: FragmentSpec, color: number, depth: number) {
    this.scene = scene;
    this.spec = spec;
    this.position = { x: spec.x, y: spec.y };

    const isShield = spec.payload === 'shield';
    const size = isShield ? 54 : POWERUPS.fragment.radius * 2.4;

    this.glow = scene.add
      .image(spec.x, spec.y, TEXTURE_KEYS.glow)
      .setDepth(depth - 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(size * 3, size * 3)
      .setAlpha(0.3)
      .setTint(color);

    this.sprite = scene.add
      .image(spec.x, spec.y, isShield ? TEXTURE_KEYS.shield : TEXTURE_KEYS.fragment)
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(size, size)
      .setTint(color);

    scene.tweens.add({
      targets: this.sprite,
      angle: isShield ? 0 : 360,
      scale: { from: 1, to: 1.14 },
      duration: isShield ? 1400 : 2600,
      repeat: -1,
      yoyo: isShield,
      ease: isShield ? 'Sine.InOut' : 'Linear',
    });
  }

  get radius(): number {
    return this.spec.payload === 'shield' ? 30 : POWERUPS.fragment.radius;
  }

  get isCollected(): boolean {
    return this.collected;
  }

  /** Gentle magnet pull so a near-perfect pass still grabs the pickup. */
  applyMagnet(orbPosition: Vector2, deltaSeconds: number): void {
    if (this.collected) return;
    const dx = orbPosition.x - this.position.x;
    const dy = orbPosition.y - this.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance > POWERUPS.fragment.magnetRadius || distance < 1) return;
    const strength = 1 - distance / POWERUPS.fragment.magnetRadius;
    const pull = strength * 620 * deltaSeconds;
    this.position.x += (dx / distance) * pull;
    this.position.y += (dy / distance) * pull;
    this.sprite.setPosition(this.position.x, this.position.y);
    this.glow.setPosition(this.position.x, this.position.y);
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: [this.sprite, this.glow],
      alpha: 0,
      scale: 2.2,
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
