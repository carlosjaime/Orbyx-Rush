import type * as Phaser from 'phaser';
import { REGISTRY_KEYS, SCENE_KEYS } from '@/game/scenes/SceneKeys';
import type { EquippedCosmetics } from '@/game/config/equipped';
import type { GameMode, GameSettings } from '@/game/types';

/**
 * Owns the single `Phaser.Game` instance.
 *
 * A module-level singleton guarded by a creation lock is the only reliable way
 * to survive React 18 StrictMode double-effects and Next.js Fast Refresh
 * without ending up with two canvases, two audio graphs and two input stacks.
 */
class GameController {
  private game: Phaser.Game | null = null;
  private creating: Promise<Phaser.Game> | null = null;
  private parent: HTMLElement | null = null;

  get instance(): Phaser.Game | null {
    return this.game;
  }

  get isRunning(): boolean {
    return this.game !== null;
  }

  /**
   * Creates the game if needed and returns it.
   *
   * Phaser is imported dynamically so it never reaches the server bundle and
   * never touches `window` during SSR.
   */
  async ensure(parent: HTMLElement, initial: InitialState): Promise<Phaser.Game> {
    if (this.game && this.parent === parent) {
      this.pushState(initial);
      return this.game;
    }
    if (this.creating) return this.creating;

    this.creating = (async () => {
      // A hot reload can leave an orphan instance attached to a stale node.
      if (this.game) this.destroy();

      // Phaser and the whole scene graph are pulled in here, and only here,
      // so neither ever reaches the server bundle.
      const [PhaserModule, { createGameConfig }] = await Promise.all([
        import('phaser'),
        import('@/game/config/gameConfig'),
      ]);
      const game = new PhaserModule.Game(createGameConfig(parent));
      this.game = game;
      this.parent = parent;
      this.pushState(initial);
      return game;
    })();

    try {
      return await this.creating;
    } finally {
      this.creating = null;
    }
  }

  /** Publishes React-owned state into the Phaser registry. */
  pushState(state: Partial<InitialState>): void {
    const registry = this.game?.registry;
    if (!registry) return;
    if (state.settings) registry.set(REGISTRY_KEYS.settings, state.settings);
    if (state.cosmetics) registry.set(REGISTRY_KEYS.cosmetics, state.cosmetics);
    if (typeof state.bestScore === 'number') {
      registry.set(REGISTRY_KEYS.bestScore, state.bestScore);
    }
  }

  /** Starts a run, replacing whatever scene is currently active. */
  startRun(mode: GameMode, seed?: string): void {
    const game = this.game;
    if (!game) return;
    const key =
      mode === 'tutorial'
        ? SCENE_KEYS.tutorial
        : mode === 'daily'
          ? SCENE_KEYS.challenge
          : SCENE_KEYS.game;

    this.stopAllGameplayScenes();
    game.scene.start(key, { mode, seed });
    if (!game.scene.isActive(SCENE_KEYS.ui)) game.scene.start(SCENE_KEYS.ui);
  }

  /** Returns to the ambient menu backdrop. */
  showMenu(): void {
    const game = this.game;
    if (!game) return;
    this.stopAllGameplayScenes();
    game.scene.stop(SCENE_KEYS.ui);
    game.scene.start(SCENE_KEYS.menu);
  }

  private stopAllGameplayScenes(): void {
    const game = this.game;
    if (!game) return;
    for (const key of [
      SCENE_KEYS.menu,
      SCENE_KEYS.game,
      SCENE_KEYS.tutorial,
      SCENE_KEYS.challenge,
      SCENE_KEYS.gameOver,
    ]) {
      if (game.scene.getScene(key)) game.scene.stop(key);
    }
  }

  /** Pauses the render loop entirely — used when the app is backgrounded. */
  pauseLoop(): void {
    this.game?.loop.sleep();
  }

  resumeLoop(): void {
    this.game?.loop.wake();
  }

  destroy(): void {
    if (!this.game) return;
    try {
      this.game.destroy(true, false);
    } catch (error) {
      console.warn('[GameController] destroy failed', error);
    }
    this.game = null;
    this.parent = null;
  }
}

export interface InitialState {
  settings: GameSettings;
  cosmetics: EquippedCosmetics;
  bestScore: number;
}

export const gameController = new GameController();
