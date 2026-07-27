import * as Phaser from 'phaser';
import { FEEDBACK, WORLD } from '@/game/config/balance';
import type { GameSettings } from '@/game/types';

type ShakeKind = keyof typeof FEEDBACK.screenShake;

/**
 * Camera shake, full-screen flashes and slow-motion.
 *
 * Every effect routes through the accessibility settings here rather than at
 * the call sites, so "reduce motion" and "reduce flashes" are impossible to
 * forget when adding a new piece of juice.
 */
export class ScreenEffects {
  private readonly scene: Phaser.Scene;
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private settings: GameSettings;
  private lastFlashAt = 0;
  private slowMoTimer = 0;

  constructor(scene: Phaser.Scene, depth: number, settings: GameSettings) {
    this.scene = scene;
    this.settings = settings;
    this.flashRect = scene.add
      .rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0xffffff, 0)
      .setScrollFactor(0)
      .setDepth(depth);
  }

  updateSettings(settings: GameSettings): void {
    this.settings = settings;
  }

  shake(kind: ShakeKind): void {
    if (!this.settings.screenShakeEnabled || this.settings.reducedMotion) return;
    const config = FEEDBACK.screenShake[kind];
    this.scene.cameras.main.shake(config.duration, config.intensity, false);
  }

  /**
   * Full-screen tint pulse. Rate-limited and alpha-capped so it can never
   * produce a photosensitivity trigger.
   */
  flash(color: number, alpha: number): void {
    if (this.settings.reducedFlashes) return;
    const now = this.scene.time.now / 1000;
    if (now - this.lastFlashAt < FEEDBACK.flash.minInterval) return;
    this.lastFlashAt = now;

    const safeAlpha = Math.min(alpha, 0.35);
    this.flashRect.setFillStyle(color, safeAlpha);
    this.scene.tweens.killTweensOf(this.flashRect);
    this.flashRect.setAlpha(1);
    this.scene.tweens.add({
      targets: this.flashRect,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.Out',
    });
  }

  /** Brief time dilation. Ignored entirely when reduced motion is on. */
  slowMotion(timeScale: number, durationSeconds: number): void {
    if (this.settings.reducedMotion) return;
    this.slowMoTimer = durationSeconds;
    this.scene.time.timeScale = timeScale;
    this.scene.tweens.timeScale = timeScale;
  }

  /** Returns the multiplier gameplay should apply to its own delta time. */
  get timeScale(): number {
    return this.slowMoTimer > 0 ? this.scene.time.timeScale : 1;
  }

  update(realDeltaSeconds: number): void {
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= realDeltaSeconds;
      if (this.slowMoTimer <= 0) {
        this.slowMoTimer = 0;
        this.scene.time.timeScale = 1;
        this.scene.tweens.timeScale = 1;
      }
    }
  }

  reset(): void {
    this.slowMoTimer = 0;
    this.scene.time.timeScale = 1;
    this.scene.tweens.timeScale = 1;
    this.flashRect.setAlpha(0);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.flashRect);
    this.flashRect.destroy();
  }
}
