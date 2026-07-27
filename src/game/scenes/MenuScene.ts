import * as Phaser from 'phaser';
import { ORBIT, WORLD } from '@/game/config/balance';
import { COLORS } from '@/game/config/palette';
import { BackgroundLayer } from '@/game/effects/BackgroundLayer';
import { TEXTURE_KEYS } from '@/game/effects/textures';
import { DEPTH } from '@/game/systems/ProceduralLevelSystem';
import { REGISTRY_KEYS, SCENE_KEYS } from '@/game/scenes/SceneKeys';
import { getEquippedColors } from '@/game/config/equipped';
import type { GameSettings } from '@/game/types';

/**
 * Ambient menu backdrop.
 *
 * The menu *interface* is React; this scene only renders the living background
 * behind it — a demo orb tracing a lazy orbit so the mechanic is legible before
 * the player has pressed anything.
 */
export class MenuScene extends Phaser.Scene {
  private background: BackgroundLayer | null = null;
  private demoOrb: Phaser.GameObjects.Image | null = null;
  private demoHalo: Phaser.GameObjects.Image | null = null;
  private demoCore: Phaser.GameObjects.Image | null = null;
  private demoRing: Phaser.GameObjects.Image | null = null;
  private angle = 0;
  private motionEnabled = true;

  constructor(key: string = SCENE_KEYS.menu) {
    super(key);
  }

  create(): void {
    const settings = this.registry.get(REGISTRY_KEYS.settings) as GameSettings | undefined;
    this.motionEnabled = settings ? settings.backgroundMotion && !settings.reducedMotion : true;

    const cosmetics = getEquippedColors(this.registry);
    this.background = new BackgroundLayer(this, DEPTH.background, cosmetics.theme);
    this.background.setIntensity(0.25);
    this.background.setMotionEnabled(this.motionEnabled);

    const centerX = WORLD.width / 2;
    const centerY = WORLD.height * 0.42;
    const radius = ORBIT.maxRadius * 1.1;

    this.demoRing = this.add
      .image(centerX, centerY, TEXTURE_KEYS.ring)
      .setDepth(DEPTH.cores)
      .setDisplaySize(radius * 2, radius * 2)
      .setAlpha(0.22)
      .setTint(COLORS.primary);

    this.demoCore = this.add
      .image(centerX, centerY, TEXTURE_KEYS.coreCore)
      .setDepth(DEPTH.cores + 1)
      .setDisplaySize(64, 64)
      .setTint(COLORS.secondary);

    this.demoHalo = this.add
      .image(centerX + radius, centerY, TEXTURE_KEYS.glow)
      .setDepth(DEPTH.orb)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(200, 200)
      .setAlpha(0.5)
      .setTint(cosmetics.orbPrimaryNumeric);

    this.demoOrb = this.add
      .image(centerX + radius, centerY, TEXTURE_KEYS.orb)
      .setDepth(DEPTH.orb + 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(70, 70)
      .setTint(cosmetics.orbPrimaryNumeric);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.on(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  /** Re-reads settings and cosmetics without recreating the scene. */
  refresh(): void {
    const settings = this.registry.get(REGISTRY_KEYS.settings) as GameSettings | undefined;
    this.motionEnabled = settings ? settings.backgroundMotion && !settings.reducedMotion : true;
    this.background?.setMotionEnabled(this.motionEnabled);
    const cosmetics = getEquippedColors(this.registry);
    this.demoOrb?.setTint(cosmetics.orbPrimaryNumeric);
    this.demoHalo?.setTint(cosmetics.orbPrimaryNumeric);
  }

  override update(_time: number, delta: number): void {
    const deltaSeconds = Math.min(delta / 1000, 0.05);
    this.background?.update(deltaSeconds, 0);
    if (!this.motionEnabled) return;

    this.angle += deltaSeconds * 0.75;
    const centerX = WORLD.width / 2;
    const centerY = WORLD.height * 0.42;
    const radius = ORBIT.maxRadius * 1.1;
    const x = centerX + Math.cos(this.angle) * radius;
    const y = centerY + Math.sin(this.angle) * radius;
    this.demoOrb?.setPosition(x, y);
    this.demoHalo?.setPosition(x, y);
    this.demoCore?.setRotation(this.angle * 0.4);
    this.demoRing?.setRotation(-this.angle * 0.2);
  }

  private cleanup(): void {
    this.background?.destroy();
    this.background = null;
  }
}
