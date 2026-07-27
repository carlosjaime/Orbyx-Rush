import * as Phaser from 'phaser';
import { PERFORMANCE, WORLD } from '@/game/config/balance';
import { COLORS } from '@/game/config/palette';
import { detectCapabilities } from '@/game/adapters/PlatformAdapter';
import { BootScene } from '@/game/scenes/BootScene';
import { ChallengeScene } from '@/game/scenes/ChallengeScene';
import { GameOverScene } from '@/game/scenes/GameOverScene';
import { GameScene } from '@/game/scenes/GameScene';
import { MenuScene } from '@/game/scenes/MenuScene';
import { PreloadScene } from '@/game/scenes/PreloadScene';
import { TutorialScene } from '@/game/scenes/TutorialScene';
import { UIScene } from '@/game/scenes/UIScene';

/**
 * Builds the Phaser configuration.
 *
 * Portrait-first: the logical resolution is a fixed 1080x1920 and Phaser's FIT
 * mode letterboxes it, so the playfield has identical proportions on a phone,
 * a tablet and a desktop browser — no stretching, no hidden edges.
 */
export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  const capabilities = detectCapabilities();
  const resolution = Math.min(capabilities.pixelRatio, PERFORMANCE.maxDevicePixelRatio);

  return {
    type: capabilities.supportsWebGL ? Phaser.AUTO : Phaser.CANVAS,
    parent,
    backgroundColor: COLORS.void,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD.width,
      height: WORLD.height,
      // Phaser reads this to size the backing buffer; capping it is the single
      // biggest win on high-DPI phones.
      zoom: 1 / Math.max(1, resolution / PERFORMANCE.maxDevicePixelRatio),
    },
    render: {
      antialias: true,
      powerPreference: 'high-performance',
      roundPixels: false,
      // The whole game is additive glow on black; premultiplied alpha keeps the
      // blending correct on both WebGL and the canvas fallback.
      premultipliedAlpha: true,
      transparent: false,
    },
    fps: {
      target: PERFORMANCE.targetFps,
      forceSetTimeOut: false,
      smoothStep: true,
    },
    input: {
      activePointers: 2,
      touch: { capture: true },
    },
    audio: {
      // Audio is handled entirely by our own Web Audio graph.
      noAudio: true,
    },
    banner: false,
    disableContextMenu: true,
    autoFocus: true,
    scene: [
      BootScene,
      PreloadScene,
      MenuScene,
      TutorialScene,
      GameScene,
      ChallengeScene,
      GameOverScene,
      UIScene,
    ],
  };
}
