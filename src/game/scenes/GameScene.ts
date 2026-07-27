import * as Phaser from 'phaser';
import { BRIDGE, FEEDBACK, LAUNCH, POWERUPS, WORLD, clamp } from '@/game/config/balance';
import { COLORS, PALETTE, resolveColors, resolvePalette } from '@/game/config/palette';
import { debugState } from '@/game/config/debug';
import { getEquippedColors } from '@/game/config/equipped';
import { BackgroundLayer } from '@/game/effects/BackgroundLayer';
import { FloatingTextPool } from '@/game/effects/FloatingTextPool';
import { ParticleSystem } from '@/game/effects/ParticleSystem';
import { ScreenEffects } from '@/game/effects/ScreenEffects';
import { Orb } from '@/game/entities/Orb';
import type { CoreEntity } from '@/game/entities/CoreEntity';
import { gameBus, type DeathCause } from '@/game/events/GameEvents';
import { findLaunchSolutions } from '@/game/physics/orbitMath';
import { createRandomSeed } from '@/game/procedural/rng';
import { getAudioManager } from '@/game/audio/AudioManager';
import { getHapticsManager } from '@/game/managers/HapticsManager';
import { CaptureSystem } from '@/game/systems/CaptureSystem';
import { CollisionSystem, checkBounds } from '@/game/systems/CollisionSystem';
import { DifficultySystem } from '@/game/systems/DifficultySystem';
import { LaunchSystem } from '@/game/systems/LaunchSystem';
import { OrbitSystem } from '@/game/systems/OrbitSystem';
import { PowerUpSystem } from '@/game/systems/PowerUpSystem';
import {
  ProceduralLevelSystem,
  DEPTH,
  type LevelPalette,
} from '@/game/systems/ProceduralLevelSystem';
import { ScoreSystem } from '@/game/systems/ScoreSystem';
import { REGISTRY_KEYS, SCENE_KEYS } from '@/game/scenes/SceneKeys';
import { DEFAULT_SETTINGS } from '@/services/persistence/schema';
import type { GameMode, GameSettings, RunStats } from '@/game/types';

export interface GameSceneData {
  mode?: GameMode;
  seed?: string;
}

type RunState = 'running' | 'paused' | 'dead';

/** Maximum delta accepted in one step; protects against tab-switch spikes. */
const MAX_DELTA_SECONDS = 1 / 20;

/**
 * The main gameplay scene.
 *
 * It owns no rules of its own: every decision is delegated to a system, and
 * this class is the orchestrator that wires them to Phaser's frame loop, to
 * rendering, and to the React bridge.
 */
export class GameScene extends Phaser.Scene {
  protected mode: GameMode = 'endless';
  protected seed = '';

  private settings: GameSettings = { ...DEFAULT_SETTINGS };
  private runState: RunState = 'running';

  private orb!: Orb;
  private background!: BackgroundLayer;
  private particles!: ParticleSystem;
  private floatingText!: FloatingTextPool;
  private screenEffects!: ScreenEffects;
  private level!: ProceduralLevelSystem;

  private readonly orbit = new OrbitSystem();
  private readonly launcher = new LaunchSystem();
  private readonly capture = new CaptureSystem();
  private readonly collisions = new CollisionSystem();
  private readonly difficulty = new DifficultySystem();
  private readonly score = new ScoreSystem();
  private readonly powerUps = new PowerUpSystem();

  private currentCore: CoreEntity | null = null;
  private previousCoreY = 0;
  private cameraTargetY = 0;
  private hudTimer = 0;
  private bestScore = 0;
  private recordAnnounced = false;
  private revivesUsed = 0;

  private debugGraphics!: Phaser.GameObjects.Graphics;
  private fpsText!: Phaser.GameObjects.Text;
  private readonly disposers: Array<() => void> = [];

  constructor(key: string = SCENE_KEYS.game) {
    super(key);
  }

  init(data: GameSceneData): void {
    this.mode = data.mode ?? this.defaultMode();
    this.seed = data.seed ?? debugState.current.forcedSeed ?? createRandomSeed();
    this.runState = 'running';
    this.recordAnnounced = false;
    this.revivesUsed = 0;
  }

  /** Overridden by the tutorial and challenge scenes. */
  protected defaultMode(): GameMode {
    return 'endless';
  }

  /** Tutorial disables hazards entirely. */
  protected get peaceful(): boolean {
    return false;
  }

  create(): void {
    this.settings =
      (this.registry.get(REGISTRY_KEYS.settings) as GameSettings | undefined) ?? DEFAULT_SETTINGS;
    this.bestScore = Number(this.registry.get(REGISTRY_KEYS.bestScore) ?? 0);

    const cosmetics = getEquippedColors(this.registry);

    this.background = new BackgroundLayer(this, DEPTH.background, cosmetics.theme);
    this.background.setMotionEnabled(
      this.settings.backgroundMotion && !this.settings.reducedMotion,
    );

    this.particles = new ParticleSystem(this, DEPTH.particles);
    this.particles.setQuality(this.settings.particleQuality);
    this.floatingText = new FloatingTextPool(this, DEPTH.floatingText);
    this.screenEffects = new ScreenEffects(this, DEPTH.overlay, this.settings);

    this.level = new ProceduralLevelSystem(
      this,
      this.buildLevelPalette(),
      this.seed,
      this.peaceful,
    );

    this.orb = new Orb(this, DEPTH.orb);
    this.orb.setColors(cosmetics.orbPrimary, cosmetics.trail);
    this.orb.setTrailEnabled(!this.settings.reducedMotion);

    this.debugGraphics = this.add.graphics().setDepth(DEPTH.overlay - 1);
    this.fpsText = this.add
      .text(20, 20, '', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: PALETTE.success,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.overlay + 1)
      .setVisible(false);

    this.registerInput();
    this.registerBusListeners();
    this.beginRun();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private buildLevelPalette(): LevelPalette {
    const colors = resolveColors(this.settings.highContrast);
    return {
      core: {
        body: colors.primary,
        orbit: colors.primary,
        capture: colors.primaryDim,
        glow: colors.primary,
      },
      coreDecoy: {
        body: colors.textFaint,
        orbit: colors.textMuted,
        capture: colors.textFaint,
        glow: colors.textMuted,
      },
      hazard: colors.danger,
      hazardWarn: colors.warning,
      fragment: colors.accentOrange,
      shield: colors.success,
      zone: {
        slow: colors.secondary,
        boost: colors.accentMagenta,
        gravity: colors.warning,
        portal: colors.success,
      },
    };
  }

  // ------------------------------------------------------------------ run ---

  protected beginRun(): void {
    this.score.reset();
    this.powerUps.reset();
    this.difficulty.reset();
    this.collisions.resetFlight();
    this.particles.clear();
    this.floatingText.clear();
    this.screenEffects.reset();

    const startCore = this.level.start();
    this.attachToCore(startCore, {
      x: startCore.position.x + startCore.orbitRadius,
      y: startCore.position.y,
    });
    this.previousCoreY = startCore.position.y;

    this.cameraTargetY = startCore.position.y - WORLD.height * 0.72;
    this.cameras.main.setScroll(0, this.cameraTargetY);

    this.level.ensureGenerated(this.cameraTargetY, 0);
    this.refreshTargetHighlight();

    const audio = getAudioManager();
    audio.startMusic('run');
    audio.setIntensity(0);

    gameBus.emit('RUN_STARTED', { mode: this.mode, seed: this.seed });
    this.pushHud();
  }

  private registerInput(): void {
    const launch = () => this.handlePrimaryAction();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, launch);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-SPACE', launch);
      keyboard.on('keydown-ENTER', launch);
      keyboard.on('keydown-ESC', () => gameBus.emit('REQUEST_PAUSE'));
      keyboard.on('keydown-P', () => gameBus.emit('REQUEST_PAUSE'));
      // Prevent the page from scrolling when the player taps space.
      keyboard.addCapture(['SPACE', 'ENTER', 'ESC']);
    }
  }

  private registerBusListeners(): void {
    this.disposers.push(
      gameBus.on('REQUEST_PAUSE', () => this.pauseRun('user')),
      gameBus.on('REQUEST_RESUME', () => this.resumeRun()),
      gameBus.on('REQUEST_RESTART', () => this.restartRun()),
      gameBus.on('REQUEST_REVIVE', () => this.revive()),
      gameBus.on('SETTINGS_CHANGED', (settings) => this.applySettings(settings)),
      gameBus.on('DEBUG_COMMAND', (payload) => this.handleDebugCommand(payload)),
    );
  }

  private applySettings(settings: GameSettings): void {
    this.settings = settings;
    this.particles.setQuality(settings.particleQuality);
    this.screenEffects.updateSettings(settings);
    this.background.setMotionEnabled(settings.backgroundMotion && !settings.reducedMotion);
    this.orb.setTrailEnabled(!settings.reducedMotion);
  }

  /** Tap / click / space: release the orb. */
  protected handlePrimaryAction(): void {
    if (this.runState !== 'running') return;
    if (!this.orbit.isAttached) return;

    const position = this.orbit.position;
    const direction = this.orbit.releaseDirection;
    if (!position || !direction) return;

    const speed = this.difficulty.current.launchSpeed;
    this.launcher.launch(position, direction, speed);
    this.collisions.resetFlight();

    const leavingCore = this.currentCore;
    this.orbit.detach();
    if (leavingCore?.spec.decoy) leavingCore.collapse();

    getAudioManager().playSfx('launch', 0.9 + Math.random() * 0.2);
    this.particles.burst({
      x: position.x,
      y: position.y,
      count: FEEDBACK.particles.captureCount,
      color: COLORS.primary,
      speed: 260,
      life: 0.4,
      size: 16,
      spread: Math.PI * 0.7,
      angle: Math.atan2(direction.y, direction.x) + Math.PI,
    });

    this.onLaunched();
  }

  /** Hook for the tutorial. */
  protected onLaunched(): void {}

  /** Hook for the tutorial. */
  protected onCaptured(_perfect: boolean): void {}

  // --------------------------------------------------------------- update ---

  override update(_time: number, delta: number): void {
    if (this.runState === 'paused') return;

    const debug = debugState.current;
    const realDelta = Math.min(delta / 1000, MAX_DELTA_SECONDS);
    const simulated = debug.simulateSlowDevice ? realDelta * 1.9 : realDelta;
    const gameplayDelta =
      simulated * this.powerUps.timeScale * this.screenEffects.timeScale * debug.timeScale;

    this.screenEffects.update(realDelta);
    this.powerUps.update(realDelta);

    if (this.runState === 'dead') {
      this.particles.update(realDelta);
      this.floatingText.update(realDelta);
      this.background.update(realDelta, this.cameras.main.scrollY);
      return;
    }

    this.difficulty.update(gameplayDelta);
    this.score.tick(gameplayDelta, this.difficulty.tier);
    this.level.update(gameplayDelta);

    if (this.orbit.isAttached) {
      this.updateOrbiting(gameplayDelta);
    } else {
      this.updateFlying(gameplayDelta);
    }

    this.orb.update(gameplayDelta);
    this.particles.update(realDelta);
    this.floatingText.update(realDelta);

    this.updateCamera(realDelta);
    this.level.ensureGenerated(this.cameras.main.scrollY, this.difficulty.tier);
    this.level.cull(this.cameras.main.scrollY, this.currentCore?.spec.id ?? null);
    this.background.update(realDelta, this.cameras.main.scrollY);

    this.updateAudioIntensity();
    this.drawDebugOverlay();

    this.hudTimer += realDelta * 1000;
    if (this.hudTimer >= BRIDGE.hudThrottleMs) {
      this.hudTimer = 0;
      this.pushHud();
    }
  }

  private updateOrbiting(deltaSeconds: number): void {
    const core = this.currentCore;
    if (core) this.orbit.syncCenter(core.position, core.orbitRadius);

    const position = this.orbit.advance(deltaSeconds);
    if (position) this.orb.setPosition(position.x, position.y);

    // Safety net: an orbit that never ends would stall the difficulty ramp.
    if (this.orbit.exceededMaxOrbitTime) this.handlePrimaryAction();
  }

  private updateFlying(deltaSeconds: number): void {
    const flight = this.launcher.current;
    if (!flight) return;

    const previous = { x: flight.position.x, y: flight.position.y };

    const candidates = this.level.captureCandidates;
    const excludeId = flight.graceRemaining > 0 ? (this.currentCore?.spec.id ?? null) : null;
    const assistCandidate = this.capture.pickAssistTarget(
      flight.position,
      flight.velocity,
      candidates,
      excludeId,
    );

    this.launcher.applyBoost(this.powerUps.speedMultiplier);
    this.launcher.applyExternalAcceleration(this.powerUps.lateralAcceleration, 0);

    const position = this.launcher.advance(
      deltaSeconds,
      assistCandidate
        ? { center: assistCandidate.center, captureRadius: assistCandidate.captureRadius }
        : null,
    );
    if (!position) return;
    this.orb.setPosition(position.x, position.y);

    this.processZones(position);
    this.processPickups(position, deltaSeconds);

    if (this.processHazards(previous, position)) return;

    const verdict = this.capture.evaluate(position, candidates, excludeId);
    if (verdict) {
      const core = this.level.findCore(verdict.candidateId);
      if (core) {
        this.completeCapture(core, verdict.quality === 'perfect', position);
        return;
      }
    }

    const boundsFailure = checkBounds(position, this.cameras.main.scrollY);
    if (boundsFailure) {
      this.die(boundsFailure);
      return;
    }
    if (this.launcher.exceededMaxFlightTime) this.die('missed-core');
  }

  private processZones(position: { x: number; y: number }): void {
    for (const zone of this.level.activeZones) {
      if (zone.isConsumed) continue;
      const distance = Math.hypot(position.x - zone.position.x, position.y - zone.position.y);
      if (distance > zone.radius) continue;

      if (zone.spec.kind === 'portal' && zone.spec.destination) {
        zone.markConsumed();
        this.launcher.teleport(zone.spec.destination);
        this.orb.clearTrail();
        this.particles.burst({
          x: zone.spec.destination.x,
          y: zone.spec.destination.y,
          count: FEEDBACK.particles.perfectCount,
          color: COLORS.success,
          speed: 420,
          life: 0.5,
          size: 18,
        });
        getAudioManager().playSfx('shield', 1.3);
        continue;
      }

      const direction = position.x < WORLD.width / 2 ? 1 : -1;
      this.powerUps.enterZone(zone.spec.kind, direction);
      zone.markConsumed();
    }
  }

  private processPickups(position: { x: number; y: number }, deltaSeconds: number): void {
    for (const pickup of this.level.activePickups) {
      if (pickup.isCollected) continue;
      pickup.applyMagnet(position, deltaSeconds);
      const distance = Math.hypot(position.x - pickup.position.x, position.y - pickup.position.y);
      if (distance > pickup.radius + this.orb.radius) continue;

      pickup.collect();
      if (pickup.spec.payload === 'shield') {
        this.powerUps.grantShield();
        this.orb.setShieldVisible(true);
        getAudioManager().playSfx('shield');
        getHapticsManager().fire('perfect');
        gameBus.emit('SHIELD_CHANGED', { active: true });
        this.floatingText.spawn({
          x: pickup.position.x,
          y: pickup.position.y,
          label: 'ESCUDO',
          color: PALETTE.success,
          size: 34,
        });
      } else {
        this.score.registerFragment(1);
        getAudioManager().playSfx('fragment', 0.9 + Math.random() * 0.3);
        getHapticsManager().fire('fragment');
        this.particles.burst({
          x: pickup.position.x,
          y: pickup.position.y,
          count: FEEDBACK.particles.fragmentCount,
          color: COLORS.accentOrange,
          speed: 200,
          life: 0.35,
          size: 12,
        });
        gameBus.emit('FRAGMENT_COLLECTED', { total: this.score.snapshot(false, 0).fragments });
      }
    }
  }

  /** Returns true when the run ended during hazard processing. */
  private processHazards(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
    const results = this.collisions.check(from, to, this.orb.radius, this.level.hazardProbes);

    for (const result of results) {
      if (result.kind === 'hit') {
        if (debugState.current.invincible) continue;
        const outcome = this.powerUps.absorbHit();
        if (outcome === 'fatal') {
          const hazard = this.level.findHazard(result.hazardId);
          this.die(hazard?.spec.kind === 'laser' ? 'laser' : 'obstacle');
          return true;
        }
        if (outcome === 'shielded') {
          this.orb.setShieldVisible(false);
          gameBus.emit('SHIELD_CHANGED', { active: false });
          this.screenEffects.shake('impact');
          this.screenEffects.flash(COLORS.success, FEEDBACK.flash.perfectAlpha);
          getAudioManager().playSfx('shield', 0.7);
          getHapticsManager().fire('impact');
          this.powerUps.grantInvulnerability(0.6);
          this.orb.setInvulnerableVisual(true);
          this.time.delayedCall(600, () => this.orb.setInvulnerableVisual(false));
        }
        continue;
      }

      if (result.kind === 'near-miss') {
        this.score.registerNearMiss();
        this.level.findHazard(result.hazardId)?.flashNearMiss();
        this.floatingText.spawn({
          x: to.x,
          y: to.y - 40,
          label: '¡AL FILO!',
          color: PALETTE.warning,
          size: 30,
          life: 0.7,
        });
      }
    }

    return false;
  }

  private completeCapture(
    core: CoreEntity,
    perfect: boolean,
    position: { x: number; y: number },
  ): void {
    const verticalProgress = Math.max(0, this.previousCoreY - core.position.y);
    const outcome = this.score.registerCapture({ perfect, verticalProgress });

    this.previousCoreY = core.position.y;
    this.difficulty.registerCore();
    this.launcher.stop();
    this.attachToCore(core, position);
    core.markVisited();
    this.refreshTargetHighlight();

    const audio = getAudioManager();
    const colors = resolveColors(this.settings.highContrast);
    const palette = resolvePalette(this.settings.highContrast);

    if (perfect) {
      audio.playSfx('perfect');
      getHapticsManager().fire('perfect');
      this.screenEffects.shake('perfect');
      this.screenEffects.slowMotion(
        POWERUPS.perfectSlowMo.timeScale,
        POWERUPS.perfectSlowMo.duration,
      );
      this.particles.ring({
        x: core.position.x,
        y: core.position.y,
        radius: core.orbitRadius,
        count: FEEDBACK.particles.perfectCount,
        color: colors.success,
      });
      this.floatingText.spawn({
        x: position.x,
        y: position.y - 50,
        label: 'PERFECTO',
        color: palette.success,
        size: 44,
      });
    } else {
      audio.playSfx('capture', 0.92 + Math.random() * 0.16);
      getHapticsManager().fire('capture');
      this.screenEffects.shake('capture');
      this.particles.burst({
        x: position.x,
        y: position.y,
        count: FEEDBACK.particles.captureCount,
        color: colors.primary,
        speed: 240,
        life: 0.4,
        size: 14,
      });
    }

    core.playCapturePulse(perfect);
    this.orb.pulse(perfect ? 1 : 0.5);

    this.floatingText.spawn({
      x: position.x + 60,
      y: position.y,
      label: `+${outcome.breakdown.total}`,
      color: perfect ? palette.success : palette.text,
      size: perfect ? 40 : 34,
    });

    if (outcome.streakFragmentBonus > 0) {
      this.floatingText.spawn({
        x: position.x - 60,
        y: position.y - 30,
        label: '+1 FRAGMENTO',
        color: palette.accentOrange,
        size: 28,
      });
    }

    if (outcome.combo > 0 && outcome.combo % 5 === 0) {
      audio.playSfx('combo', 1 + Math.min(0.6, outcome.combo / 60));
      this.floatingText.spawn({
        x: WORLD.width / 2,
        y: position.y - 130,
        label: `COMBO x${outcome.combo}`,
        color: palette.accentMagenta,
        size: 40,
      });
    }

    gameBus.emit('COMBO_CHANGED', {
      combo: outcome.combo,
      multiplier: outcome.multiplier,
      tier: this.score.comboTier,
    });
    gameBus.emit('SCORE_CHANGED', {
      score: this.score.liveScore,
      delta: outcome.breakdown.total,
    });

    this.checkRecord();
    this.onCaptured(perfect);
    this.pushHud();
  }

  private attachToCore(core: CoreEntity, approachPoint: { x: number; y: number }): void {
    this.currentCore = core;
    this.orbit.attach({
      center: core.position,
      approachPoint,
      targetRadius: core.orbitRadius,
      spin: core.spec.spin,
      angularSpeed: core.spec.angularSpeed,
    });
  }

  private refreshTargetHighlight(): void {
    const current = this.currentCore;
    for (const core of this.level.activeCores) core.setTargeted(false);
    const next = this.level.nextTargetAbove(current?.position.y ?? WORLD.height);
    next?.setTargeted(true);
  }

  private checkRecord(): void {
    if (this.recordAnnounced || this.mode === 'tutorial') return;
    if (this.bestScore <= 0 || this.score.liveScore <= this.bestScore) return;
    this.recordAnnounced = true;
    getAudioManager().playSfx('record');
    getHapticsManager().fire('record');
    this.screenEffects.flash(COLORS.warning, FEEDBACK.flash.recordAlpha);
    this.screenEffects.shake('record');
    this.floatingText.spawn({
      x: WORLD.width / 2,
      y: this.cameras.main.scrollY + WORLD.height * 0.32,
      label: '¡NUEVO RÉCORD!',
      color: PALETTE.warning,
      size: 52,
      life: 1.5,
    });
  }

  private updateCamera(deltaSeconds: number): void {
    const orbY = this.orb.position.y;
    const desired = orbY - WORLD.height * 0.62;
    // The camera never scrolls back down: the void must keep closing in.
    this.cameraTargetY = Math.min(this.cameraTargetY, desired);
    const camera = this.cameras.main;
    const lerpFactor = 1 - Math.pow(0.0015, deltaSeconds);
    camera.setScroll(0, Phaser.Math.Linear(camera.scrollY, this.cameraTargetY, lerpFactor));
  }

  private updateAudioIntensity(): void {
    const tiers = this.score.comboTier;
    getAudioManager().setIntensity(clamp(tiers / 5, 0, 1));
    this.background.setIntensity(clamp(tiers / 5, 0, 1));
  }

  // ----------------------------------------------------------------- HUD ---

  private pushHud(): void {
    gameBus.emit('HUD_TICK', this.currentStats());
  }

  private currentStats(): RunStats {
    return this.score.snapshot(this.powerUps.shieldActive, this.revivesUsed);
  }

  // ---------------------------------------------------------------- death ---

  protected die(cause: DeathCause): void {
    if (this.runState === 'dead') return;
    this.runState = 'dead';

    const audio = getAudioManager();
    audio.playSfx('impact');
    audio.playSfx('gameover');
    audio.setIntensity(0);
    audio.stopMusic();
    getHapticsManager().fire('impact');

    this.screenEffects.shake('impact');
    this.screenEffects.flash(COLORS.danger, FEEDBACK.flash.deathAlpha);
    this.particles.burst({
      x: this.orb.position.x,
      y: this.orb.position.y,
      count: FEEDBACK.particles.deathCount,
      color: resolveColors(this.settings.highContrast).danger,
      speed: 520,
      life: 0.9,
      size: 22,
    });
    this.orb.setVisible(false);
    this.launcher.stop();
    this.orbit.detach();

    const stats = this.currentStats();
    gameBus.emit('HUD_TICK', stats);
    gameBus.emit('PLAYER_DIED', {
      cause,
      canRevive: this.canRevive(),
      stats,
      mode: this.mode,
      seed: this.seed,
    });
  }

  private canRevive(): boolean {
    if (this.mode === 'tutorial') return false;
    return this.revivesUsed < POWERUPS.revive.maxPerRun;
  }

  /**
   * Second chance. The cost is paid in fragments earned by playing — it is
   * never purchasable and never tied to watching anything.
   */
  private revive(): void {
    if (this.runState !== 'dead' || !this.canRevive()) return;
    const core = this.currentCore ?? this.level.nextTargetAbove(WORLD.height * 2);
    if (!core) return;

    this.revivesUsed += 1;
    this.runState = 'running';
    this.orb.setVisible(true);
    this.orb.clearTrail();
    this.powerUps.grantInvulnerability();
    this.orb.setInvulnerableVisual(true);
    this.time.delayedCall(POWERUPS.revive.invulnerability * 1000, () =>
      this.orb.setInvulnerableVisual(false),
    );

    this.attachToCore(core, { x: core.position.x + core.orbitRadius, y: core.position.y });
    this.previousCoreY = core.position.y;
    this.cameraTargetY = core.position.y - WORLD.height * 0.62;

    getAudioManager().startMusic('run');
    gameBus.emit('RUN_RESUMED');
    this.pushHud();
  }

  // ---------------------------------------------------------------- flow ---

  protected pauseRun(reason: 'user' | 'blur' | 'system'): void {
    if (this.runState !== 'running') return;
    this.runState = 'paused';
    void getAudioManager().suspend();
    gameBus.emit('RUN_PAUSED', { reason });
  }

  protected resumeRun(): void {
    if (this.runState !== 'paused') return;
    this.runState = 'running';
    void getAudioManager().resume();
    gameBus.emit('RUN_RESUMED');
  }

  protected restartRun(): void {
    // Restarting the scene is instant and never touches the page: no reload,
    // no React remount, no audio context teardown.
    this.scene.restart({ mode: this.mode, seed: this.nextSeed() });
  }

  /** Endless runs get a fresh seed; the daily challenge keeps its own. */
  protected nextSeed(): string {
    return debugState.current.forcedSeed ?? createRandomSeed();
  }

  // ---------------------------------------------------------------- debug ---

  private handleDebugCommand(payload: {
    command: string;
    value?: number | string | boolean;
  }): void {
    switch (payload.command) {
      case 'add-score':
        this.score.addDebugScore(Number(payload.value ?? 1000));
        this.pushHud();
        break;
      case 'force-game-over':
        this.die('obstacle');
        break;
      case 'spawn-obstacle':
        this.level.ensureGenerated(
          this.cameras.main.scrollY - WORLD.height,
          this.difficulty.tier + 3,
        );
        break;
      case 'set-seed':
        if (typeof payload.value === 'string') {
          this.scene.restart({ mode: this.mode, seed: payload.value });
        }
        break;
      case 'clear-storage':
        break;
      default:
        break;
    }
  }

  private drawDebugOverlay(): void {
    const debug = debugState.current;
    this.fpsText.setVisible(debug.showFps);
    if (debug.showFps) {
      this.fpsText
        .setPosition(20, this.cameras.main.scrollY + 20)
        .setText(
          [
            `FPS ${Math.round(this.game.loop.actualFps)}`,
            `tier ${this.difficulty.tier.toFixed(2)}`,
            `seed ${this.seed}`,
            `cores ${this.level.activeCores.length}`,
          ].join('\n'),
        );
    }

    this.debugGraphics.clear();
    if (!debug.showHitboxes && !debug.showGravityRadius && !debug.showTrajectory) return;

    if (debug.showGravityRadius) {
      this.debugGraphics.lineStyle(2, COLORS.secondary, 0.6);
      for (const core of this.level.activeCores) {
        this.debugGraphics.strokeCircle(core.position.x, core.position.y, core.captureRadius);
      }
    }

    if (debug.showHitboxes) {
      this.debugGraphics.lineStyle(2, COLORS.danger, 0.8);
      for (const hazard of this.level.activeHazards) {
        const [a, b] = hazard.segment;
        this.debugGraphics.lineBetween(a.x, a.y, b.x, b.y);
      }
      this.debugGraphics.strokeCircle(this.orb.position.x, this.orb.position.y, this.orb.radius);
    }

    if (debug.showTrajectory && this.orbit.isAttached && this.currentCore) {
      const target = this.level.nextTargetAbove(this.currentCore.position.y);
      if (target) {
        const solutions = findLaunchSolutions(
          this.currentCore.position,
          this.currentCore.orbitRadius,
          this.currentCore.spec.spin,
          target.position,
        );
        this.debugGraphics.lineStyle(2, COLORS.success, 0.7);
        for (const solution of solutions) {
          this.debugGraphics.lineBetween(
            solution.releasePoint.x,
            solution.releasePoint.y,
            solution.releasePoint.x + solution.direction.x * solution.travelDistance,
            solution.releasePoint.y + solution.direction.y * solution.travelDistance,
          );
        }
      }
      const direction = this.orbit.releaseDirection;
      const position = this.orbit.position;
      if (direction && position) {
        this.debugGraphics.lineStyle(3, COLORS.warning, 0.9);
        this.debugGraphics.lineBetween(
          position.x,
          position.y,
          position.x +
            direction.x * LAUNCH.maxFlightTime * this.difficulty.current.launchSpeed * 0.35,
          position.y +
            direction.y * LAUNCH.maxFlightTime * this.difficulty.current.launchSpeed * 0.35,
        );
      }
    }
  }

  // -------------------------------------------------------------- cleanup ---

  private cleanup(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers.length = 0;
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    this.background?.destroy();
    this.particles?.destroy();
    this.floatingText?.destroy();
    this.screenEffects?.destroy();
    this.level?.destroy();
    this.orb?.destroy();
  }

  /** Exposed for the tutorial subclass. */
  protected get orbitSystem(): OrbitSystem {
    return this.orbit;
  }

  protected get levelSystem(): ProceduralLevelSystem {
    return this.level;
  }

  protected get isRunning(): boolean {
    return this.runState === 'running';
  }

  protected get orbEntity(): Orb {
    return this.orb;
  }

  protected get textPool(): FloatingTextPool {
    return this.floatingText;
  }
}
