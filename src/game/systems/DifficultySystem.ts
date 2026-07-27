import { DIFFICULTY, LAUNCH, ORBIT, clamp, rangeAt } from '@/game/config/balance';

/** Everything the level generator and the game scene need for one moment in time. */
export interface DifficultySnapshot {
  /** Continuous difficulty tier in `[0, DIFFICULTY.maxTier]`. */
  tier: number;
  /** Normalised progress in `[0, 1]` used to interpolate every range. */
  t: number;
  gapY: number;
  gapX: number;
  orbitRadius: number;
  angularSpeed: number;
  launchSpeed: number;
  obstacleChance: number;
  movingCoreChance: number;
  pulsingCoreChance: number;
  reverseCoreChance: number;
  decoyCoreChance: number;
  fragmentChance: number;
  zoneChance: number;
  laserUnlocked: boolean;
  portalUnlocked: boolean;
}

/**
 * Blends "cores reached" and "seconds survived" into a single difficulty tier.
 *
 * Using both sources means a player cannot stall the ramp by orbiting forever,
 * and a lucky fast chain does not skip several tiers at once.
 */
export function computeTier(coresReached: number, secondsSurvived: number): number {
  const coreProgress = coresReached / DIFFICULTY.coresPerTier;
  const timeProgress = secondsSurvived / DIFFICULTY.secondsPerTier;
  const blended = coreProgress * DIFFICULTY.coreWeight + timeProgress * DIFFICULTY.timeWeight;
  // Logarithmic flattening: fast early ramp, long tail near the ceiling.
  const eased = Math.log1p(blended * 1.85) / Math.log1p(1.85);
  return clamp(eased * DIFFICULTY.maxTier, 0, DIFFICULTY.maxTier);
}

/** Resolves every difficulty-driven parameter for a given tier. */
export function snapshotForTier(tier: number): DifficultySnapshot {
  const clamped = clamp(tier, 0, DIFFICULTY.maxTier);
  const t = clamped / DIFFICULTY.maxTier;
  const unlocked = (threshold: number) => clamped >= threshold;
  const gated = (range: { start: number; end: number }, threshold: number) =>
    unlocked(threshold) ? rangeAt(range, t) : 0;

  return {
    tier: clamped,
    t,
    gapY: rangeAt(DIFFICULTY.gapY, t),
    gapX: rangeAt(DIFFICULTY.gapX, t),
    orbitRadius: clamp(rangeAt(DIFFICULTY.orbitRadius, t), ORBIT.minRadius, ORBIT.maxRadius),
    angularSpeed: clamp(
      ORBIT.baseAngularSpeed * rangeAt(DIFFICULTY.angularSpeedMul, t),
      ORBIT.minAngularSpeed,
      ORBIT.maxAngularSpeed,
    ),
    launchSpeed: clamp(
      LAUNCH.baseSpeed * rangeAt(DIFFICULTY.launchSpeedMul, t),
      LAUNCH.minSpeed,
      LAUNCH.maxSpeed,
    ),
    obstacleChance: gated(DIFFICULTY.obstacleChance, DIFFICULTY.unlockTier.obstacle),
    movingCoreChance: gated(DIFFICULTY.movingCoreChance, DIFFICULTY.unlockTier.movingCore),
    pulsingCoreChance: gated(DIFFICULTY.pulsingCoreChance, DIFFICULTY.unlockTier.pulsingCore),
    reverseCoreChance: rangeAt(DIFFICULTY.reverseCoreChance, t),
    decoyCoreChance: gated(DIFFICULTY.decoyCoreChance, DIFFICULTY.unlockTier.decoyCore),
    fragmentChance: rangeAt(DIFFICULTY.fragmentChance, t),
    zoneChance: gated(DIFFICULTY.zoneChance, DIFFICULTY.unlockTier.zone),
    laserUnlocked: unlocked(DIFFICULTY.unlockTier.laser),
    portalUnlocked: unlocked(DIFFICULTY.unlockTier.portal),
  };
}

/**
 * Stateful wrapper used by `GameScene`. Kept separate from the pure functions
 * above so tests never need to instantiate it.
 */
export class DifficultySystem {
  private coresReached = 0;
  private seconds = 0;
  private snapshot: DifficultySnapshot = snapshotForTier(0);
  /** Fixed tier used by the tutorial and by deterministic QA runs. */
  private forcedTier: number | null = null;

  reset(): void {
    this.coresReached = 0;
    this.seconds = 0;
    this.snapshot = snapshotForTier(0);
  }

  forceTier(tier: number | null): void {
    this.forcedTier = tier;
    this.recompute();
  }

  update(deltaSeconds: number): void {
    this.seconds += deltaSeconds;
    this.recompute();
  }

  registerCore(): void {
    this.coresReached += 1;
    this.recompute();
  }

  get current(): DifficultySnapshot {
    return this.snapshot;
  }

  get tier(): number {
    return this.snapshot.tier;
  }

  private recompute(): void {
    const tier = this.forcedTier ?? computeTier(this.coresReached, this.seconds);
    this.snapshot = snapshotForTier(tier);
  }
}
