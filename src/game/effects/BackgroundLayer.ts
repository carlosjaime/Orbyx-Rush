import * as Phaser from 'phaser';
import { FEEDBACK, WORLD } from '@/game/config/balance';
import { TEXTURE_KEYS } from '@/game/effects/textures';
import { hexToNumber } from '@/game/config/palette';

/**
 * Layered parallax backdrop: three star fields plus a nebula band.
 *
 * Every layer is a single tiling quad scrolled by `tilePositionY`, so depth
 * costs four draw calls total regardless of how far the player travels.
 */
export class BackgroundLayer {
  private readonly scene: Phaser.Scene;
  private readonly nebula: Phaser.GameObjects.TileSprite;
  private readonly far: Phaser.GameObjects.TileSprite;
  private readonly mid: Phaser.GameObjects.TileSprite;
  private readonly near: Phaser.GameObjects.TileSprite;
  private readonly vignette: Phaser.GameObjects.Image;

  private motionEnabled = true;
  private intensity = 0;
  private targetIntensity = 0;
  private drift = 0;

  constructor(scene: Phaser.Scene, depth: number, themeColors: readonly [string, string]) {
    this.scene = scene;
    const width = WORLD.width;
    const height = WORLD.height;

    const make = (key: string, alpha: number, tint: number, scale: number) =>
      scene.add
        .tileSprite(width / 2, height / 2, width, height, key)
        .setScrollFactor(0)
        .setDepth(depth)
        .setAlpha(alpha)
        .setTint(tint)
        .setTileScale(scale, scale);

    const accent = hexToNumber(themeColors[1]);

    this.nebula = make(TEXTURE_KEYS.nebula, 0.5, accent, 2.2).setBlendMode(Phaser.BlendModes.ADD);
    this.far = make(TEXTURE_KEYS.starSmall, 0.55, 0xffffff, 1.4);
    this.mid = make(TEXTURE_KEYS.starSmall, 0.7, accent, 1);
    this.near = make(TEXTURE_KEYS.starMedium, 0.85, 0xffffff, 1);

    this.nebula.setDepth(depth);
    this.far.setDepth(depth + 1);
    this.mid.setDepth(depth + 2);
    this.near.setDepth(depth + 3);

    // Soft vignette keeps the HUD legible over bright nebula patches without
    // leaving a visible seam where the darkening stops.
    this.vignette = scene.add
      .image(width / 2, height / 2, TEXTURE_KEYS.vignette)
      .setScrollFactor(0)
      .setDepth(depth + 4)
      .setDisplaySize(width, height)
      .setTint(hexToNumber(themeColors[0]))
      .setAlpha(0.9);
  }

  setMotionEnabled(enabled: boolean): void {
    this.motionEnabled = enabled;
  }

  /** 0..1, normally the combo tier. Drives brightness and drift speed. */
  setIntensity(value: number): void {
    this.targetIntensity = Phaser.Math.Clamp(value, 0, 1);
  }

  update(deltaSeconds: number, cameraScrollY: number): void {
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, deltaSeconds * 2.4);

    // Parallax is driven by the camera so it stays exact when the run is
    // paused or slowed down by a time-scale effect.
    this.nebula.tilePositionY = cameraScrollY * FEEDBACK.parallax.nebula;
    this.far.tilePositionY = cameraScrollY * FEEDBACK.parallax.farStars;
    this.mid.tilePositionY = cameraScrollY * FEEDBACK.parallax.midStars;
    this.near.tilePositionY = cameraScrollY * FEEDBACK.parallax.nearStars;

    if (this.motionEnabled) {
      this.drift += deltaSeconds * (6 + this.intensity * 26);
      this.nebula.tilePositionX = this.drift * 0.3;
      this.mid.tilePositionX = this.drift * 0.12;
    }

    const boost = this.intensity;
    this.nebula.setAlpha(0.4 + boost * 0.45);
    this.mid.setAlpha(0.6 + boost * 0.3);
    this.near.setAlpha(0.75 + boost * 0.25);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.nebula, this.far, this.mid, this.near]);
    this.nebula.destroy();
    this.far.destroy();
    this.mid.destroy();
    this.near.destroy();
    this.vignette.destroy();
  }
}
