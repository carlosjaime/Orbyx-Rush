import * as Phaser from 'phaser';
import { WORLD } from '@/game/config/balance';
import { COLORS } from '@/game/config/palette';
import { gameBus } from '@/game/events/GameEvents';
import { SCENE_KEYS } from '@/game/scenes/SceneKeys';

/**
 * Canvas-side overlay.
 *
 * Almost the whole HUD is React (crisper text, real accessibility semantics,
 * no per-frame canvas work). What stays here is the handful of effects that
 * must be composited *inside* the canvas: the death dim and the pause veil.
 */
export class UIScene extends Phaser.Scene {
  private veil!: Phaser.GameObjects.Rectangle;
  private readonly disposers: Array<() => void> = [];

  constructor() {
    super({ key: SCENE_KEYS.ui, active: false });
  }

  create(): void {
    this.veil = this.add
      .rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, COLORS.void, 0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.disposers.push(
      gameBus.on('PLAYER_DIED', () => this.fadeVeil(0.55)),
      gameBus.on('RUN_PAUSED', () => this.fadeVeil(0.45)),
      gameBus.on('RUN_RESUMED', () => this.fadeVeil(0)),
      gameBus.on('RUN_STARTED', () => this.fadeVeil(0)),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private fadeVeil(alpha: number): void {
    this.tweens.killTweensOf(this.veil);
    this.tweens.add({
      targets: this.veil,
      fillAlpha: alpha,
      duration: 240,
      ease: 'Cubic.Out',
    });
  }

  private cleanup(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
    this.tweens.killTweensOf(this.veil);
  }
}
