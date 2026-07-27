import * as Phaser from 'phaser';
import { WORLD } from '@/game/config/balance';
import { COLORS, PALETTE } from '@/game/config/palette';
import { generateTextures } from '@/game/effects/textures';
import { gameBus } from '@/game/events/GameEvents';
import { SCENE_KEYS } from '@/game/scenes/SceneKeys';

/**
 * Generates the procedural texture atlas and reports progress.
 *
 * There are no network requests to wait on — everything is drawn locally — so
 * the "loading" phase is really a texture bake. The progress bar is still real:
 * it advances as each batch of textures is committed.
 */
export class PreloadScene extends Phaser.Scene {
  private barFill: Phaser.GameObjects.Rectangle | null = null;
  private label: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(SCENE_KEYS.preload);
  }

  create(): void {
    this.drawLoader();

    // Bake in two ticks so the browser can paint the loader first.
    this.reportProgress(0.15);
    this.time.delayedCall(16, () => {
      try {
        generateTextures(this);
        this.reportProgress(0.85);
      } catch (error) {
        console.error('[PreloadScene] texture generation failed', error);
        this.showError();
        return;
      }

      this.time.delayedCall(60, () => {
        this.reportProgress(1);
        gameBus.emit('GAME_READY', { ready: true });
        this.scene.start(SCENE_KEYS.menu);
      });
    });
  }

  private drawLoader(): void {
    const centerX = WORLD.width / 2;
    const centerY = WORLD.height / 2;

    this.add.rectangle(centerX, centerY, WORLD.width, WORLD.height, COLORS.void).setDepth(0);

    this.label = this.add
      .text(centerX, centerY - 90, 'ORBYX RUSH', {
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: '76px',
        fontStyle: 'bold',
        color: PALETTE.primary,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .rectangle(centerX, centerY + 40, 520, 10, COLORS.surfaceBorder)
      .setOrigin(0.5)
      .setDepth(1);

    this.barFill = this.add
      .rectangle(centerX - 260, centerY + 40, 0, 10, COLORS.primary)
      .setOrigin(0, 0.5)
      .setDepth(2);
  }

  private reportProgress(value: number): void {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    this.barFill?.setSize(520 * clamped, 10);
    gameBus.emit('PRELOAD_PROGRESS', { progress: clamped });
  }

  private showError(): void {
    this.label?.setText('ERROR DE CARGA').setColor(PALETTE.danger);
    this.add
      .text(
        WORLD.width / 2,
        WORLD.height / 2 + 40,
        'No se pudieron generar los gráficos.\nRecarga la página para reintentar.',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '34px',
          color: PALETTE.textMuted,
          align: 'center',
        },
      )
      .setOrigin(0.5);
  }
}
