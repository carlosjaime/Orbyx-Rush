import { COMBO, SCORING, clamp } from '@/game/config/balance';

/**
 * The scoring formula, in one place.
 *
 * Conceptually:
 *   (base + distance) x comboMultiplier + precisionBonus + riskBonus
 *
 * The multiplier only scales the *earned* part, while precision and risk
 * bonuses are flat. That keeps a long safe chain from dwarfing a short,
 * dangerous, perfectly executed one.
 */

export interface CaptureScoreInput {
  /** Vertical progress since the previous core, in logical px. */
  distance: number;
  /** Combo multiplier active at capture time. */
  multiplier: number;
  perfect: boolean;
  /** Near misses accumulated during the flight that just ended. */
  nearMisses: number;
  /** Fragments picked up during the flight that just ended. */
  fragments: number;
}

export interface CaptureScoreBreakdown {
  base: number;
  distanceBonus: number;
  multiplied: number;
  precisionBonus: number;
  riskBonus: number;
  fragmentBonus: number;
  total: number;
}

/** Score awarded by a single successful capture. */
export function scoreCapture(input: CaptureScoreInput): CaptureScoreBreakdown {
  const distance = Math.max(0, input.distance);
  const multiplier = Math.max(1, input.multiplier);
  const base = SCORING.coreBase;
  const distanceBonus = (distance / 100) * SCORING.distancePer100px;
  const multiplied = (base + distanceBonus) * multiplier;
  const precisionBonus = input.perfect ? SCORING.perfectBonus : 0;
  const riskBonus = Math.max(0, input.nearMisses) * SCORING.nearMissBonus;
  const fragmentBonus = Math.max(0, input.fragments) * SCORING.fragmentBonus * multiplier;

  return {
    base,
    distanceBonus: Math.round(distanceBonus),
    multiplied: Math.round(multiplied),
    precisionBonus,
    riskBonus,
    fragmentBonus: Math.round(fragmentBonus),
    total: Math.round(multiplied + precisionBonus + riskBonus + fragmentBonus),
  };
}

export interface RunScoreInput {
  /** Sum of every capture award earned during the run. */
  captureScore: number;
  durationSeconds: number;
  /** Highest difficulty tier reached. */
  tier: number;
}

/**
 * Final score for a run: capture score plus a survival stipend, the whole
 * thing scaled by the difficulty actually reached.
 */
export function scoreRun(input: RunScoreInput): number {
  const survival = Math.max(0, input.durationSeconds) * SCORING.survivalPerSecond;
  const subtotal = Math.max(0, input.captureScore) + survival;
  const difficultyScale = 1 + Math.max(0, input.tier) * SCORING.difficultyWeight;
  return Math.round(subtotal * difficultyScale);
}

/** Combo multiplier derived from the raw combo counter. */
export function multiplierForCombo(combo: number): number {
  const steps = Math.floor(Math.max(0, combo) / COMBO.step);
  return clamp(1 + steps * COMBO.gain, 1, COMBO.maxMultiplier);
}

/** Discrete combo tier, used for audio layering and background intensity. */
export function comboTier(combo: number): number {
  let tier = 0;
  for (let i = 0; i < COMBO.tiers.length; i += 1) {
    if (combo >= (COMBO.tiers[i] ?? 0)) tier = i;
  }
  return tier;
}

/**
 * Applies one capture to the combo counter.
 *
 * A sloppy capture at a high combo trims the chain instead of wiping it: the
 * player feels the mistake without losing a whole run's worth of momentum.
 */
export function advanceCombo(combo: number, perfect: boolean): number {
  const current = Math.max(0, combo);
  if (perfect) return current + COMBO.perfectIncrement;
  if (current >= COMBO.sloppyPenaltyThreshold) {
    return Math.max(0, Math.floor(current * (1 - COMBO.sloppyPenaltyRatio)));
  }
  return current + COMBO.normalIncrement;
}
