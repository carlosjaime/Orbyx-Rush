import * as Phaser from 'phaser';
import { TEXTURE_KEYS } from '@/game/effects/textures';
import type { Vector2, ZoneSpec } from '@/game/types';

/** Slow-motion, boost, gravity and teleport fields. */
export class ZoneEntity {
  readonly spec: ZoneSpec;
  readonly position: Vector2;

  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Graphics;
  private readonly exit: Phaser.GameObjects.Image | null = null;
  private consumed = false;

  constructor(scene: Phaser.Scene, spec: ZoneSpec, color: number, depth: number) {
    this.scene = scene;
    this.spec = spec;
    this.position = { x: spec.x, y: spec.y };

    const isPortal = spec.kind === 'portal';

    this.sprite = scene.add
      .image(spec.x, spec.y, isPortal ? TEXTURE_KEYS.portal : TEXTURE_KEYS.zone)
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(spec.radius * 2, spec.radius * 2)
      .setTint(color)
      .setAlpha(isPortal ? 0.9 : 0.55);

    scene.tweens.add({
      targets: this.sprite,
      angle: isPortal ? 360 : 0,
      scale: { from: 1, to: isPortal ? 1 : 1.08 },
      duration: isPortal ? 5200 : 2100,
      repeat: -1,
      yoyo: !isPortal,
      ease: isPortal ? 'Linear' : 'Sine.InOut',
    });

    // Each zone type also carries a distinct glyph so the effect is readable
    // without relying on its colour.
    this.label = scene.add
      .graphics()
      .setDepth(depth + 1)
      .setPosition(spec.x, spec.y);
    this.drawGlyph(color);

    if (isPortal && spec.destination) {
      this.exit = scene.add
        .image(spec.destination.x, spec.destination.y, TEXTURE_KEYS.portal)
        .setDepth(depth)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(spec.radius * 1.6, spec.radius * 1.6)
        .setTint(color)
        .setAlpha(0.5);
    }
  }

  private drawGlyph(color: number): void {
    const g = this.label;
    g.clear();
    g.lineStyle(5, color, 0.95);
    switch (this.spec.kind) {
      case 'slow':
        // Hourglass.
        g.beginPath();
        g.moveTo(-14, -16);
        g.lineTo(14, -16);
        g.lineTo(-14, 16);
        g.lineTo(14, 16);
        g.closePath();
        g.strokePath();
        break;
      case 'boost':
        // Double chevron pointing up.
        for (const offset of [6, -8]) {
          g.beginPath();
          g.moveTo(-14, offset + 8);
          g.lineTo(0, offset - 8);
          g.lineTo(14, offset + 8);
          g.strokePath();
        }
        break;
      case 'gravity':
        // Converging arcs.
        g.beginPath();
        g.arc(0, 0, 18, Math.PI * 0.15, Math.PI * 0.85);
        g.strokePath();
        g.beginPath();
        g.arc(0, 0, 18, Math.PI * 1.15, Math.PI * 1.85);
        g.strokePath();
        break;
      case 'portal':
      default:
        break;
    }
  }

  get radius(): number {
    return this.spec.radius;
  }

  get isConsumed(): boolean {
    return this.consumed;
  }

  markConsumed(): void {
    this.consumed = true;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.18,
      duration: 260,
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
    this.label.destroy();
    this.exit?.destroy();
  }
}
