import { SCORING } from '@/game/config/balance';
import {
  advanceCombo,
  comboTier,
  multiplierForCombo,
  scoreCapture,
  scoreRun,
  type CaptureScoreBreakdown,
} from '@/game/systems/scoring';
import type { RunStats } from '@/game/types';

/**
 * Live score and combo bookkeeping for a single run.
 *
 * All arithmetic delegates to the pure helpers in `scoring.ts`; this class only
 * owns the mutable run state so the formula itself stays trivially testable.
 */
export class ScoreSystem {
  private captureScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private coresReached = 0;
  private perfectCaptures = 0;
  private perfectStreak = 0;
  private bestPerfectStreak = 0;
  private nearMisses = 0;
  private pendingNearMisses = 0;
  private fragments = 0;
  private pendingFragments = 0;
  private distance = 0;
  private elapsed = 0;
  private tier = 0;
  private perfectsSinceFragmentBonus = 0;

  reset(): void {
    this.captureScore = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.coresReached = 0;
    this.perfectCaptures = 0;
    this.perfectStreak = 0;
    this.bestPerfectStreak = 0;
    this.nearMisses = 0;
    this.pendingNearMisses = 0;
    this.fragments = 0;
    this.pendingFragments = 0;
    this.distance = 0;
    this.elapsed = 0;
    this.tier = 0;
    this.perfectsSinceFragmentBonus = 0;
  }

  tick(deltaSeconds: number, tier: number): void {
    this.elapsed += deltaSeconds;
    this.tier = Math.max(this.tier, tier);
  }

  registerNearMiss(): void {
    this.nearMisses += 1;
    this.pendingNearMisses += 1;
  }

  /** Returns the number of bonus fragments awarded by a perfect streak. */
  registerFragment(count = 1): void {
    this.fragments += count;
    this.pendingFragments += count;
  }

  get multiplier(): number {
    return multiplierForCombo(this.combo);
  }

  get currentCombo(): number {
    return this.combo;
  }

  get comboTier(): number {
    return comboTier(this.combo);
  }

  /** Applies a capture and returns everything the UI needs to celebrate it. */
  registerCapture(options: { perfect: boolean; verticalProgress: number }): {
    breakdown: CaptureScoreBreakdown;
    combo: number;
    multiplier: number;
    streakFragmentBonus: number;
  } {
    const multiplier = this.multiplier;
    const breakdown = scoreCapture({
      distance: options.verticalProgress,
      multiplier,
      perfect: options.perfect,
      nearMisses: this.pendingNearMisses,
      fragments: this.pendingFragments,
    });

    this.captureScore += breakdown.total;
    this.pendingNearMisses = 0;
    this.pendingFragments = 0;
    this.coresReached += 1;
    this.distance += Math.max(0, options.verticalProgress);

    if (options.perfect) {
      this.perfectCaptures += 1;
      this.perfectStreak += 1;
      this.bestPerfectStreak = Math.max(this.bestPerfectStreak, this.perfectStreak);
      this.perfectsSinceFragmentBonus += 1;
    } else {
      this.perfectStreak = 0;
    }

    let streakFragmentBonus = 0;
    if (this.perfectsSinceFragmentBonus >= SCORING.perfectStreakFragmentEvery) {
      this.perfectsSinceFragmentBonus = 0;
      streakFragmentBonus = 1;
      this.registerFragment(1);
    }

    this.combo = advanceCombo(this.combo, options.perfect);
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    return {
      breakdown,
      combo: this.combo,
      multiplier: multiplierForCombo(this.combo),
      streakFragmentBonus,
    };
  }

  /** Score as it should be displayed right now (survival bonus included). */
  get liveScore(): number {
    return scoreRun({
      captureScore: this.captureScore,
      durationSeconds: this.elapsed,
      tier: this.tier,
    });
  }

  snapshot(shieldActive: boolean, revivesUsed: number): RunStats {
    return {
      score: this.liveScore,
      combo: this.combo,
      maxCombo: this.maxCombo,
      multiplier: this.multiplier,
      coresReached: this.coresReached,
      perfectCaptures: this.perfectCaptures,
      bestPerfectStreak: this.bestPerfectStreak,
      nearMisses: this.nearMisses,
      fragments: this.fragments,
      distance: this.distance,
      durationSeconds: this.elapsed,
      tier: this.tier,
      shieldActive,
      revivesUsed,
    };
  }

  /** Debug-only score injection. */
  addDebugScore(amount: number): void {
    this.captureScore += amount;
  }
}
