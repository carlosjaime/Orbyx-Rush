import * as Phaser from 'phaser';
import { PERFORMANCE } from '@/game/config/balance';
import { detectCapabilities } from '@/game/adapters/PlatformAdapter';
import { REGISTRY_KEYS, SCENE_KEYS } from '@/game/scenes/SceneKeys';
import { DEFAULT_SETTINGS } from '@/services/persistence/schema';
import type { GameSettings } from '@/game/types';

/**
 * First scene in the boot chain.
 *
 * Responsibilities: validate the device, register shared services in the game
 * registry, and hand over to the preloader. It draws nothing.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    const capabilities = detectCapabilities();
    this.registry.set(REGISTRY_KEYS.capabilities, capabilities);

    // Settings are injected by the React shell before the game boots; fall back
    // to the defaults so the scene chain never blocks on hydration.
    if (!this.registry.get(REGISTRY_KEYS.settings)) {
      this.registry.set(REGISTRY_KEYS.settings, { ...DEFAULT_SETTINGS } as GameSettings);
    }

    const settings = this.registry.get(REGISTRY_KEYS.settings) as GameSettings;
    const targetFps =
      settings.powerSaver || capabilities.graphicsTier === 'low'
        ? PERFORMANCE.powerSaverFps
        : PERFORMANCE.targetFps;
    this.game.loop.targetFps = targetFps;

    // Keep the canvas crisp without paying for a 3x buffer on cheap phones.
    this.scale.setZoom(1);

    this.scene.start(SCENE_KEYS.preload);
  }
}
