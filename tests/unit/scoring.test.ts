import { describe, expect, it } from 'vitest';
import { COMBO, SCORING } from '@/game/config/balance';
import {
  advanceCombo,
  comboTier,
  multiplierForCombo,
  scoreCapture,
  scoreRun,
} from '@/game/systems/scoring';
import { ScoreSystem } from '@/game/systems/ScoreSystem';

describe('scoreCapture', () => {
  it('awards the flat core base plus the distance bonus', () => {
    const result = scoreCapture({
      distance: 300,
      multiplier: 1,
      perfect: false,
      nearMisses: 0,
      fragments: 0,
    });
    const expected = SCORING.coreBase + (300 / 100) * SCORING.distancePer100px;
    expect(result.total).toBe(Math.round(expected));
  });

  it('scales the earned part by the combo multiplier but not the flat bonuses', () => {
    const single = scoreCapture({
      distance: 400,
      multiplier: 1,
      perfect: true,
      nearMisses: 2,
      fragments: 0,
    });
    const doubled = scoreCapture({
      distance: 400,
      multiplier: 2,
      perfect: true,
      nearMisses: 2,
      fragments: 0,
    });

    expect(doubled.multiplied).toBe(single.multiplied * 2);
    expect(doubled.precisionBonus).toBe(single.precisionBonus);
    expect(doubled.riskBonus).toBe(single.riskBonus);
  });

  it('adds the perfect bonus only on a perfect capture', () => {
    const base = { distance: 200, multiplier: 1, nearMisses: 0, fragments: 0 };
    expect(scoreCapture({ ...base, perfect: true }).precisionBonus).toBe(SCORING.perfectBonus);
    expect(scoreCapture({ ...base, perfect: false }).precisionBonus).toBe(0);
  });

  it('never returns a negative total for degenerate input', () => {
    const result = scoreCapture({
      distance: -500,
      multiplier: -3,
      perfect: false,
      nearMisses: -2,
      fragments: -4,
    });
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('is monotonic in distance', () => {
    const shorter = scoreCapture({
      distance: 100,
      multiplier: 1,
      perfect: false,
      nearMisses: 0,
      fragments: 0,
    });
    const longer = scoreCapture({
      distance: 500,
      multiplier: 1,
      perfect: false,
      nearMisses: 0,
      fragments: 0,
    });
    expect(longer.total).toBeGreaterThan(shorter.total);
  });
});

describe('scoreRun', () => {
  it('adds a survival stipend and scales by difficulty', () => {
    const flat = scoreRun({ captureScore: 1000, durationSeconds: 0, tier: 0 });
    expect(flat).toBe(1000);

    const withTime = scoreRun({ captureScore: 1000, durationSeconds: 60, tier: 0 });
    expect(withTime).toBe(1000 + 60 * SCORING.survivalPerSecond);

    const withTier = scoreRun({ captureScore: 1000, durationSeconds: 0, tier: 10 });
    expect(withTier).toBe(Math.round(1000 * (1 + 10 * SCORING.difficultyWeight)));
  });

  it('clamps negative inputs to zero rather than producing negative scores', () => {
    expect(scoreRun({ captureScore: -100, durationSeconds: -30, tier: -5 })).toBe(0);
  });
});

describe('multiplierForCombo', () => {
  it('starts at 1x and steps up every COMBO.step captures', () => {
    expect(multiplierForCombo(0)).toBe(1);
    expect(multiplierForCombo(COMBO.step - 1)).toBe(1);
    expect(multiplierForCombo(COMBO.step)).toBe(1 + COMBO.gain);
    expect(multiplierForCombo(COMBO.step * 2)).toBe(1 + COMBO.gain * 2);
  });

  it('is capped at the configured maximum', () => {
    expect(multiplierForCombo(100000)).toBe(COMBO.maxMultiplier);
  });

  it('treats a negative combo as zero', () => {
    expect(multiplierForCombo(-10)).toBe(1);
  });
});

describe('advanceCombo', () => {
  it('grows faster on perfect captures', () => {
    expect(advanceCombo(0, false)).toBe(COMBO.normalIncrement);
    expect(advanceCombo(0, true)).toBe(COMBO.perfectIncrement);
  });

  it('trims — but never wipes — a high combo after a sloppy capture', () => {
    const before = COMBO.sloppyPenaltyThreshold + 8;
    const after = advanceCombo(before, false);
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  it('does not penalise below the threshold', () => {
    const before = COMBO.sloppyPenaltyThreshold - 1;
    expect(advanceCombo(before, false)).toBe(before + COMBO.normalIncrement);
  });
});

describe('comboTier', () => {
  it('increases monotonically with the combo', () => {
    let previous = -1;
    for (const threshold of COMBO.tiers) {
      const tier = comboTier(threshold);
      expect(tier).toBeGreaterThanOrEqual(previous);
      previous = tier;
    }
  });
});

describe('ScoreSystem', () => {
  it('accumulates captures, combos and perfect streaks', () => {
    const system = new ScoreSystem();
    system.reset();

    for (let i = 0; i < 6; i += 1) {
      system.registerCapture({ perfect: true, verticalProgress: 320 });
    }

    const stats = system.snapshot(false, 0);
    expect(stats.coresReached).toBe(6);
    expect(stats.perfectCaptures).toBe(6);
    expect(stats.bestPerfectStreak).toBe(6);
    expect(stats.combo).toBe(6 * COMBO.perfectIncrement);
    expect(stats.score).toBeGreaterThan(0);
  });

  it('grants a bonus fragment every N perfect captures', () => {
    const system = new ScoreSystem();
    system.reset();
    let bonuses = 0;
    for (let i = 0; i < SCORING.perfectStreakFragmentEvery; i += 1) {
      bonuses += system.registerCapture({
        perfect: true,
        verticalProgress: 300,
      }).streakFragmentBonus;
    }
    expect(bonuses).toBe(1);
    expect(system.snapshot(false, 0).fragments).toBe(1);
  });

  it('consumes pending near misses and fragments on the next capture only', () => {
    const system = new ScoreSystem();
    system.reset();
    system.registerNearMiss();
    system.registerNearMiss();

    const first = system.registerCapture({ perfect: false, verticalProgress: 200 });
    expect(first.breakdown.riskBonus).toBe(2 * SCORING.nearMissBonus);

    const second = system.registerCapture({ perfect: false, verticalProgress: 200 });
    expect(second.breakdown.riskBonus).toBe(0);
  });

  it('resets cleanly between runs', () => {
    const system = new ScoreSystem();
    system.registerCapture({ perfect: true, verticalProgress: 900 });
    system.tick(30, 5);
    system.reset();

    const stats = system.snapshot(false, 0);
    expect(stats.score).toBe(0);
    expect(stats.combo).toBe(0);
    expect(stats.coresReached).toBe(0);
    expect(stats.durationSeconds).toBe(0);
  });
});
