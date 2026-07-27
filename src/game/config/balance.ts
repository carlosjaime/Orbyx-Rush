/**
 * Every tunable gameplay number lives in this file.
 *
 * Rules of the house:
 *  - No magic numbers in systems, entities or scenes.
 *  - Values are expressed in *logical* units (the 1080x1920 design space) and
 *    in seconds, never in frames.
 */

/** Logical design resolution. Everything is authored against this 9:16 space. */
export const WORLD = {
  width: 1080,
  height: 1920,
  /** Horizontal padding where cores are never spawned. */
  sideMargin: 130,
  /** How far off-screen (horizontally) the orb may travel before dying. */
  horizontalKillMargin: 190,
  /** Distance below the camera bottom that acts as the void kill-line. */
  voidKillMargin: 260,
} as const;

/** Orbital movement of the player sphere around a core. */
export const ORBIT = {
  /** Base angular speed in radians per second. */
  baseAngularSpeed: 2.05,
  /** Clamp applied after every difficulty modifier. */
  minAngularSpeed: 1.5,
  maxAngularSpeed: 4.6,
  /** Radius range a core can request for its captured orbit. */
  minRadius: 74,
  maxRadius: 168,
  /** Multiplier applied to the orbit radius to obtain the capture radius. */
  captureRadiusFactor: 1.42,
  /**
   * Half-width (logical px) of the band around the orbit radius that awards a
   * "perfect" capture.
   */
  perfectBand: 21,
  /** Seconds of immunity to re-capture by the core we just left. */
  releaseGrace: 0.16,
  /** Seconds the orb keeps orbiting before an auto-release safety net fires. */
  maxOrbitTime: 6,
} as const;

/** Free-flight parameters after the orb is released. */
export const LAUNCH = {
  /** Base travel speed, logical px per second. */
  baseSpeed: 720,
  minSpeed: 620,
  maxSpeed: 1360,
  /**
   * Maximum lateral steering (px/s²) applied towards the nearest valid capture
   * ring. Small enough that skill still decides the outcome, big enough that
   * near-misses caused by a 1-frame input jitter still connect.
   */
  assistAcceleration: 260,
  /** Assist only engages inside this multiple of the target capture radius. */
  assistEngageFactor: 2.6,
  /** Hard cap on how long a single flight may last before it is a miss. */
  maxFlightTime: 3.4,
  /** Trail sample spacing in seconds. */
  trailInterval: 0.016,
  trailLength: 26,
} as const;

/** Scoring weights. The formula itself lives in `systems/scoring.ts`. */
export const SCORING = {
  /** Flat award for reaching any core. */
  coreBase: 100,
  /** Points per 100 logical px of vertical progress between two cores. */
  distancePer100px: 14,
  /** Extra flat award for a capture inside the perfect band. */
  perfectBonus: 75,
  /** Award for grazing an obstacle without dying. */
  nearMissBonus: 40,
  /** Award per collected energy fragment (before multiplier). */
  fragmentBonus: 25,
  /** Award per second survived, applied at run end. */
  survivalPerSecond: 6,
  /** Difficulty tier scales the final total by 1 + tier * this. */
  difficultyWeight: 0.09,
  /** Fragments granted per perfect capture streak of 5. */
  perfectStreakFragmentEvery: 5,
} as const;

/** Combo growth and decay. */
export const COMBO = {
  /** Combo increments by 1 per successful capture, +1 extra when perfect. */
  perfectIncrement: 2,
  normalIncrement: 1,
  /** Multiplier = 1 + floor(combo / step) * gain, clamped to max. */
  step: 4,
  gain: 0.5,
  maxMultiplier: 8,
  /** A non-perfect capture at combo >= this threshold costs part of the combo. */
  sloppyPenaltyThreshold: 12,
  sloppyPenaltyRatio: 0.35,
  /** Combo tiers used for audio layering and background reactivity. */
  tiers: [0, 5, 10, 20, 35, 50] as readonly number[],
} as const;

/**
 * Difficulty curve.
 *
 * `tier` grows with cores reached AND time survived so that camping on an easy
 * orbit does not stall progression. The curve is deliberately logarithmic: the
 * first 30 seconds ramp fast (hooks the player), then it flattens so that the
 * skill ceiling is about execution, not reaction speed alone.
 */
export const DIFFICULTY = {
  maxTier: 10,
  /** Cores needed to advance one tier at the start. */
  coresPerTier: 6,
  /** Seconds needed to advance one tier at the start. */
  secondsPerTier: 22,
  /** Weight of each contribution when blending the two progress sources. */
  coreWeight: 0.65,
  timeWeight: 0.35,
  /** Vertical gap between consecutive cores, interpolated over the tier range. */
  gapY: { start: 300, end: 470 },
  /** Absolute horizontal offset between consecutive cores. */
  gapX: { start: 150, end: 430 },
  /** Orbit radius shrinks as difficulty rises, demanding better timing. */
  orbitRadius: { start: 150, end: 84 },
  /** Angular speed multiplier. */
  angularSpeedMul: { start: 1, end: 1.75 },
  /** Launch speed multiplier. */
  launchSpeedMul: { start: 1, end: 1.5 },
  /** Probability that a generated segment carries an obstacle. */
  obstacleChance: { start: 0, end: 0.72 },
  /** Probability that a core is a moving one. */
  movingCoreChance: { start: 0, end: 0.55 },
  /** Probability that a core pulses its radius. */
  pulsingCoreChance: { start: 0, end: 0.4 },
  /** Probability that a core spins the orb in the opposite direction. */
  reverseCoreChance: { start: 0.12, end: 0.45 },
  /** Probability that a core is a decoy that vanishes after one use. */
  decoyCoreChance: { start: 0, end: 0.3 },
  /** Probability of a fragment being placed on the flight path. */
  fragmentChance: { start: 0.55, end: 0.3 },
  /** Probability of a special zone (slow/boost/gravity/portal) per segment. */
  zoneChance: { start: 0, end: 0.35 },
  /** Tier at which each hazard family is unlocked. */
  unlockTier: {
    obstacle: 1,
    movingCore: 2,
    pulsingCore: 3,
    zone: 3,
    laser: 4,
    decoyCore: 5,
    portal: 6,
  },
} as const;

/** Hazards. */
export const HAZARDS = {
  obstacle: {
    minLength: 120,
    maxLength: 300,
    thickness: 22,
    /** Distance from the orb surface that counts as a "near miss". */
    nearMissRadius: 62,
    /** Rotation speed range in radians per second. */
    minSpin: -1.1,
    maxSpin: 1.1,
  },
  laser: {
    thickness: 14,
    /** Seconds of telegraph before the beam becomes lethal. */
    warmup: 0.85,
    onDuration: 1.1,
    offDuration: 1.5,
  },
  movingCore: {
    minAmplitude: 60,
    maxAmplitude: 190,
    minPeriod: 2.2,
    maxPeriod: 4.6,
  },
  pulsingCore: {
    amplitude: 0.28,
    period: 2.4,
  },
} as const;

/** Power-ups, pickups and second chances. */
export const POWERUPS = {
  fragment: {
    radius: 20,
    magnetRadius: 96,
  },
  shield: {
    /** Fragments required for the shield pickup to appear. */
    spawnChance: 0.11,
    duration: 9,
    /** Absorbs exactly one lethal hit. */
    charges: 1,
  },
  slowZone: { timeScale: 0.55, duration: 1.6 },
  boostZone: { speedMul: 1.5, duration: 1.2 },
  gravityZone: { lateralAcceleration: 520, duration: 1.4 },
  /** Perfect captures freeze time briefly for readability and juice. */
  perfectSlowMo: { timeScale: 0.35, duration: 0.12 },
  revive: {
    /** Player level required to earn the first revive charge. */
    unlockLevel: 3,
    /** Max revives usable in a single run. Earned through progression only. */
    maxPerRun: 1,
    /** Fragments consumed by a revive. Never purchasable with real money. */
    fragmentCost: 150,
    /** Seconds of invulnerability granted after reviving. */
    invulnerability: 2.2,
  },
} as const;

/** Visual feedback intensities (all scaled down by the accessibility settings). */
export const FEEDBACK = {
  screenShake: {
    capture: { duration: 90, intensity: 0.0016 },
    perfect: { duration: 130, intensity: 0.0032 },
    impact: { duration: 320, intensity: 0.011 },
    record: { duration: 260, intensity: 0.006 },
  },
  flash: {
    perfectAlpha: 0.12,
    recordAlpha: 0.22,
    deathAlpha: 0.3,
    /**
     * Minimum seconds between two full-screen flashes. Protects photosensitive
     * players: never faster than ~3 Hz, and alpha stays below 0.35.
     */
    minInterval: 0.34,
  },
  particles: {
    captureCount: 14,
    perfectCount: 26,
    fragmentCount: 10,
    deathCount: 42,
    /** Multipliers applied by the particle quality setting. */
    qualityScale: { low: 0.25, medium: 0.6, high: 1 },
  },
  parallax: {
    farStars: 0.08,
    midStars: 0.2,
    nearStars: 0.42,
    nebula: 0.04,
  },
} as const;

/** Haptics durations in milliseconds. */
export const HAPTICS = {
  capture: 12,
  perfect: 22,
  fragment: 8,
  impact: 90,
  record: 60,
  uiTap: 6,
} as const;

/** Audio mix defaults. */
export const AUDIO = {
  defaultMusicVolume: 0.55,
  defaultSfxVolume: 0.8,
  /** Master ceiling so the mix never clips on mobile speakers. */
  masterCeiling: 0.9,
  /** Seconds of cross-fade when music intensity layers change. */
  layerFade: 0.9,
  musicBpm: 124,
} as const;

/** Meta progression. */
export const PROGRESSION = {
  /** XP awarded from a run: score / this divisor, plus flat bonuses. */
  xpScoreDivisor: 40,
  xpPerPerfect: 3,
  xpPerCoreReached: 1,
  xpDailyChallengeBonus: 60,
  /** Level N requires `levelBase * N^levelExponent` cumulative XP. */
  levelBase: 120,
  levelExponent: 1.42,
  maxLevel: 60,
} as const;

/** Performance guard rails. */
export const PERFORMANCE = {
  targetFps: 60,
  powerSaverFps: 30,
  maxDevicePixelRatio: 2,
  lowEndDevicePixelRatio: 1.25,
  /** If average FPS drops below this for `degradeWindow` seconds, downgrade. */
  degradeFpsThreshold: 42,
  degradeWindow: 4,
  /** Object pool sizes. */
  pools: {
    particles: 220,
    floatingText: 16,
    obstacles: 24,
    fragments: 36,
    cores: 18,
  },
} as const;

/** How often gameplay state is pushed to React (ms). Keeps re-renders cheap. */
export const BRIDGE = {
  hudThrottleMs: 80,
} as const;

/** Linear interpolation helper shared by the difficulty curve. */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/** Clamps `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Maps a `{ start, end }` range through the normalised difficulty progress. */
export function rangeAt(range: { start: number; end: number }, t: number): number {
  return lerp(range.start, range.end, clamp(t, 0, 1));
}
