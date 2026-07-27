import * as Phaser from 'phaser';
import { WORLD } from '@/game/config/balance';
import { COLORS, PALETTE } from '@/game/config/palette';
import { MenuScene } from '@/game/scenes/MenuScene';
import { SCENE_KEYS } from '@/game/scenes/SceneKeys';

export interface GameOverSceneData {
  score: number;
  bestScore: number;
  isNewRecord: boolean;
}

/**
 * Post-run backdrop.
 *
 * The result panel itself is React (see `GameOverPanel`); this scene keeps the
 * canvas alive with the ambient starfield so the transition never shows a dead
 * black rectangle, and it renders the celebratory record banner in-world.
 */
export class GameOverScene extends MenuScene {
  private banner: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(SCENE_KEYS.gameOver);
  }

  override create(): void {
    super.create();
    const data = (this.scene.settings.data ?? {}) as Partial<GameOverSceneData>;

    this.add
      .rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, COLORS.void, 0.42)
      .setScrollFactor(0)
      .setDepth(500);

    if (!data.isNewRecord) return;

    this.banner = this.add
      .text(WORLD.width / 2, WORLD.height * 0.2, '¡NUEVO RÉCORD!', {
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: '64px',
        fontStyle: 'bold',
        color: PALETTE.warning,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(501);

    this.tweens.add({
      targets: this.banner,
      scale: { from: 0.8, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 520,
      ease: 'Back.Out',
    });
  }
}
