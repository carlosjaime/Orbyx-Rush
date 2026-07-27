import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, evaluateAchievements, newlyUnlocked } from '@/game/config/achievements';
import { SKINS, evaluateCosmeticUnlocks, isUnlocked } from '@/game/config/cosmetics';
import { PROGRESSION } from '@/game/config/balance';
import { applyRunToProfile, createEmptyRunStats } from '@/game/systems/RewardSystem';
import {
  levelForXp,
  levelProgress,
  xpForRun,
  xpRequiredForLevel,
} from '@/game/systems/progression';
import { DEFAULT_PROFILE } from '@/services/persistence/schema';
import type { PlayerProfile, RunStats } from '@/game/types';

function profile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return { ...DEFAULT_PROFILE, daysPlayed: [], achievements: {}, ...overrides };
}

function stats(overrides: Partial<RunStats> = {}): RunStats {
  return { ...createEmptyRunStats(), ...overrides };
}

describe('progression', () => {
  it('requires no XP for level 1 and increasing XP thereafter', () => {
    expect(xpRequiredForLevel(1)).toBe(0);
    let previous = 0;
    for (let level = 2; level <= 20; level += 1) {
      const required = xpRequiredForLevel(level);
      expect(required).toBeGreaterThan(previous);
      previous = required;
    }
  });

  it('maps XP back to the correct level', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(-100)).toBe(1);
    for (let level = 2; level <= 15; level += 1) {
      expect(levelForXp(xpRequiredForLevel(level))).toBe(level);
      expect(levelForXp(xpRequiredForLevel(level) - 1)).toBe(level - 1);
    }
  });

  it('caps at the configured maximum level', () => {
    expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(PROGRESSION.maxLevel);
    const progress = levelProgress(Number.MAX_SAFE_INTEGER);
    expect(progress.isMaxLevel).toBe(true);
    expect(progress.ratio).toBe(1);
  });

  it('reports a bar ratio inside [0, 1]', () => {
    for (const xp of [0, 50, 500, 5000, 50000]) {
      const progress = levelProgress(xp);
      expect(progress.ratio).toBeGreaterThanOrEqual(0);
      expect(progress.ratio).toBeLessThanOrEqual(1);
    }
  });

  it('awards more XP for a better run, and a bonus for the daily', () => {
    const weak = xpForRun(stats({ score: 1000, perfectCaptures: 1, coresReached: 4 }), false);
    const strong = xpForRun(stats({ score: 9000, perfectCaptures: 20, coresReached: 40 }), false);
    expect(strong).toBeGreaterThan(weak);

    const daily = xpForRun(stats({ score: 1000, perfectCaptures: 1, coresReached: 4 }), true);
    expect(daily).toBe(weak + PROGRESSION.xpDailyChallengeBonus);
  });

  it('always awards at least 1 XP', () => {
    expect(xpForRun(createEmptyRunStats(), false)).toBeGreaterThanOrEqual(1);
  });
});

describe('achievements', () => {
  it('has unique ids and positive targets', () => {
    const ids = new Set<string>();
    for (const achievement of ACHIEVEMENTS) {
      expect(ids.has(achievement.id)).toBe(false);
      ids.add(achievement.id);
      expect(achievement.target).toBeGreaterThan(0);
      expect(achievement.name.length).toBeGreaterThan(0);
    }
  });

  it('ships at least fifteen achievements', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
  });

  it('never regresses stored progress', () => {
    const context = {
      run: createEmptyRunStats(),
      profile: profile({ maxCombo: 0 }),
      bestPerfectStreak: 0,
      wasDaily: false,
    };
    const states = evaluateAchievements(context, { 'combo-25': 25 });
    const combo25 = states.find((state) => state.definition.id === 'combo-25');
    expect(combo25?.progress).toBe(25);
    expect(combo25?.unlocked).toBe(true);
  });

  it('reports only the achievements that crossed their target this evaluation', () => {
    const context = {
      run: createEmptyRunStats(),
      profile: profile({ totalRuns: 1, maxCombo: 10 }),
      bestPerfectStreak: 0,
      wasDaily: false,
    };
    const stored = { 'first-orbit': 1 };
    const states = evaluateAchievements(context, stored);
    const unlocked = newlyUnlocked(states, stored).map((item) => item.id);

    expect(unlocked).toContain('combo-10');
    expect(unlocked).not.toContain('first-orbit');
  });

  it('clamps progress at the target', () => {
    const context = {
      run: createEmptyRunStats(),
      profile: profile({ maxCombo: 5000 }),
      bestPerfectStreak: 0,
      wasDaily: false,
    };
    const state = evaluateAchievements(context, {}).find((s) => s.definition.id === 'combo-10');
    expect(state?.progress).toBe(10);
    expect(state?.ratio).toBe(1);
  });
});

describe('cosmetics', () => {
  it('unlocks the starter skin by default and nothing else', () => {
    const context = {
      level: 1,
      bestScore: 0,
      maxCombo: 0,
      totalPerfectCaptures: 0,
      challengesCompleted: 0,
      achievements: {},
    };
    const defaults = SKINS.filter((skin) => isUnlocked(skin.unlock, context));
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.id).toBe('cyan-pulse');
  });

  it('returns only newly satisfied cosmetics', () => {
    const context = {
      level: 3,
      bestScore: 0,
      maxCombo: 0,
      totalPerfectCaptures: 0,
      challengesCompleted: 0,
      achievements: {},
    };
    const unlocked = evaluateCosmeticUnlocks(context, ['cyan-pulse']);
    expect(unlocked.map((item) => item.id)).toContain('violet-drift');
    expect(unlocked.map((item) => item.id)).not.toContain('cyan-pulse');
  });
});

describe('applyRunToProfile', () => {
  it('records a new best score and flags the record', () => {
    const result = applyRunToProfile({
      profile: profile({ bestScore: 1000 }),
      stats: stats({ score: 2500, coresReached: 12 }),
      mode: 'endless',
      seed: 'TEST',
    });
    expect(result.result.isNewRecord).toBe(true);
    expect(result.result.previousBest).toBe(1000);
    expect(result.profile.bestScore).toBe(2500);
  });

  it('does not lower an existing best score', () => {
    const result = applyRunToProfile({
      profile: profile({ bestScore: 9000 }),
      stats: stats({ score: 100 }),
      mode: 'endless',
      seed: 'TEST',
    });
    expect(result.profile.bestScore).toBe(9000);
    expect(result.result.isNewRecord).toBe(false);
  });

  it('accumulates lifetime counters', () => {
    const result = applyRunToProfile({
      profile: profile({ totalRuns: 4, totalFragments: 10, fragments: 10, nearMissTotal: 3 }),
      stats: stats({ fragments: 7, nearMisses: 2, perfectCaptures: 5, distance: 4000 }),
      mode: 'endless',
      seed: 'TEST',
    });
    expect(result.profile.totalRuns).toBe(5);
    expect(result.profile.totalFragments).toBe(17);
    expect(result.profile.fragments).toBe(17);
    expect(result.profile.nearMissTotal).toBe(5);
    expect(result.profile.totalPerfectCaptures).toBe(5);
    expect(result.profile.totalDistance).toBe(4000);
  });

  it('awards XP and levels the player up', () => {
    const result = applyRunToProfile({
      profile: profile(),
      stats: stats({ score: 20000, perfectCaptures: 30, coresReached: 50 }),
      mode: 'endless',
      seed: 'TEST',
    });
    expect(result.result.xpGained).toBeGreaterThan(0);
    expect(result.profile.xp).toBe(result.result.xpGained);
    expect(result.result.levelAfter).toBeGreaterThan(result.result.levelBefore);
  });

  it('treats a tutorial run as practice: no record, no XP, no run count', () => {
    const before = profile({ bestScore: 500, totalRuns: 3, xp: 200 });
    const result = applyRunToProfile({
      profile: before,
      stats: stats({ score: 99999, coresReached: 10 }),
      mode: 'tutorial',
      seed: 'TUTORIAL',
    });
    expect(result.profile.bestScore).toBe(500);
    expect(result.profile.totalRuns).toBe(3);
    expect(result.profile.xp).toBe(200);
    expect(result.result.isNewRecord).toBe(false);
    expect(result.result.xpGained).toBe(0);
  });

  it('counts a daily challenge exactly once per day', () => {
    const now = new Date('2026-04-10T10:00:00Z');
    const first = applyRunToProfile({
      profile: profile(),
      stats: stats({ score: 4000, coresReached: 5 }),
      mode: 'daily',
      seed: 'ORBYX-DAILY-2026-04-10',
      now,
    });
    expect(first.profile.challengesCompleted).toBe(1);

    const second = applyRunToProfile({
      profile: first.profile,
      stats: stats({ score: 6000, coresReached: 9 }),
      mode: 'daily',
      seed: 'ORBYX-DAILY-2026-04-10',
      now,
    });
    expect(second.profile.challengesCompleted).toBe(1);
    expect(second.profile.lastDailyBest).toBe(6000);
  });

  it('records each distinct day only once in daysPlayed', () => {
    const now = new Date('2026-04-10T10:00:00Z');
    let current = profile();
    for (let i = 0; i < 4; i += 1) {
      current = applyRunToProfile({
        profile: current,
        stats: stats({ score: 100 }),
        mode: 'endless',
        seed: 'X',
        now,
      }).profile;
    }
    expect(current.daysPlayed).toEqual(['2026-04-10']);
  });

  it('unlocks achievement-gated cosmetics in the same run that earned them', () => {
    const result = applyRunToProfile({
      profile: profile(),
      stats: stats({ score: 1000, perfectCaptures: 12, bestPerfectStreak: 12, coresReached: 12 }),
      mode: 'endless',
      seed: 'CHAIN',
    });
    expect(result.result.unlockedAchievements).toContain('perfect-chain-10');
    expect(result.result.unlockedSkins).toContain('ion-thread');
    expect(result.profile.unlockedTrails).toContain('ion-thread');
  });

  it('is pure: the input profile is never mutated', () => {
    const original = profile({ bestScore: 10, totalRuns: 1 });
    const snapshot = JSON.stringify(original);
    applyRunToProfile({
      profile: original,
      stats: stats({ score: 5000, fragments: 4 }),
      mode: 'endless',
      seed: 'PURE',
    });
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});
