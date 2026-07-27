import * as Phaser from 'phaser';
import { LAUNCH } from '@/game/config/balance';
import { TEXTURE_KEYS } from '@/game/effects/textures';
import { hexToNumber } from '@/game/config/palette';
import type { Vector2 } from '@/game/types';

/**
 * The player-controlled energy sphere.
 *
 * Owns its own rendering (body, halo, shield ring and trail) but no gameplay
 * rules: position and state are driven entirely by the scene's systems.
 */

export type OrbState = 'orbiting' | 'flying' | 'dead';

const ORB_RADIUS = 20;
const TRAIL_SEGMENTS = LAUNCH.trailLength;

export class Orb {
  readonly radius = ORB_RADIUS;

  private readonly scene: Phaser.Scene;
  private readonly body: Phaser.GameObjects.Image;
  private readonly halo: Phaser.GameObjects.Image;
  private readonly shieldRing: Phaser.GameObjects.Image;
  private readonly trail: Phaser.GameObjects.Graphics;
  private readonly trailPoints: Vector2[] = [];

  private primaryColor = 0xffffff;
  private trailColor = 0xffffff;
  private trailTimer = 0;
  private trailEnabled = true;

  state: OrbState = 'orbiting';
  position: Vector2 = { x: 0, y: 0 };
  velocity: Vector2 = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;

    this.trail = scene.add.graphics().setDepth(depth - 1);
    this.halo = scene.add
      .image(0, 0, TEXTURE_KEYS.glow)
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(ORB_RADIUS * 9, ORB_RADIUS * 9)
      .setAlpha(0.55);
    this.body = scene.add
      .image(0, 0, TEXTURE_KEYS.orb)
      .setDepth(depth + 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(ORB_RADIUS * 3.4, ORB_RADIUS * 3.4);
    this.shieldRing = scene.add
      .image(0, 0, TEXTURE_KEYS.ring)
      .setDepth(depth + 2)
      .setDisplaySize(ORB_RADIUS * 4.2, ORB_RADIUS * 4.2)
      .setAlpha(0)
      .setVisible(false);
  }

  /** Applies the equipped cosmetic colours. */
  setColors(primaryHex: string, trailHex: string): void {
    this.primaryColor = hexToNumber(primaryHex);
    this.trailColor = hexToNumber(trailHex);
    this.body.setTint(this.primaryColor);
    this.halo.setTint(this.primaryColor);
    this.shieldRing.setTint(hexToNumber('#ffffff'));
  }

  setTrailEnabled(enabled: boolean): void {
    this.trailEnabled = enabled;
    if (!enabled) {
      this.trailPoints.length = 0;
      this.trail.clear();
    }
  }

  setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    this.body.setPosition(x, y);
    this.halo.setPosition(x, y);
    this.shieldRing.setPosition(x, y);
  }

  setShieldVisible(active: boolean): void {
    this.shieldRing.setVisible(active);
    this.scene.tweens.killTweensOf(this.shieldRing);
    if (active) {
      this.shieldRing.setAlpha(0.9);
      this.scene.tweens.add({
        targets: this.shieldRing,
        alpha: { from: 0.9, to: 0.35 },
        scale: { from: 1, to: 1.12 },
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    } else {
      this.shieldRing.setAlpha(0);
    }
  }

  /** Pulses the halo — used on capture and on perfect capture. */
  pulse(strength: number): void {
    this.scene.tweens.add({
      targets: this.halo,
      alpha: { from: Math.min(1, 0.55 + strength * 0.45), to: 0.55 },
      duration: 260,
      ease: 'Cubic.Out',
    });
  }

  update(deltaSeconds: number): void {
    if (!this.trailEnabled) return;
    this.trailTimer += deltaSeconds;
    if (this.trailTimer >= LAUNCH.trailInterval) {
      this.trailTimer = 0;
      this.trailPoints.push({ x: this.position.x, y: this.position.y });
      if (this.trailPoints.length > TRAIL_SEGMENTS) this.trailPoints.shift();
    }
    this.drawTrail();
  }

  private drawTrail(): void {
    this.trail.clear();
    if (this.trailPoints.length < 2) return;
    for (let i = 1; i < this.trailPoints.length; i += 1) {
      const previous = this.trailPoints[i - 1]!;
      const current = this.trailPoints[i]!;
      const t = i / this.trailPoints.length;
      this.trail.lineStyle(this.radius * 1.5 * t, this.trailColor, t * 0.55);
      this.trail.beginPath();
      this.trail.moveTo(previous.x, previous.y);
      this.trail.lineTo(current.x, current.y);
      this.trail.strokePath();
    }
  }

  clearTrail(): void {
    this.trailPoints.length = 0;
    this.trail.clear();
  }

  setVisible(visible: boolean): void {
    this.body.setVisible(visible);
    this.halo.setVisible(visible);
    this.trail.setVisible(visible);
    if (!visible) this.shieldRing.setVisible(false);
  }

  /** Blinking used during post-revive invulnerability. */
  setInvulnerableVisual(active: boolean): void {
    this.scene.tweens.killTweensOf(this.body);
    if (active) {
      this.scene.tweens.add({
        targets: this.body,
        alpha: { from: 1, to: 0.3 },
        duration: 140,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.body.setAlpha(1);
    }
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.body, this.halo, this.shieldRing]);
    this.body.destroy();
    this.halo.destroy();
    this.shieldRing.destroy();
    this.trail.destroy();
  }
}
