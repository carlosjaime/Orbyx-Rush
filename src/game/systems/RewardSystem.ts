import {
  evaluateAchievements,
  newlyUnlocked,
  type AchievementContext,
  type AchievementDefinition,
} from '@/game/config/achievements';
import {
  evaluateCosmeticUnlocks,
  unlockContextFromProfile,
  type CosmeticDefinition,
} from '@/game/config/cosmetics';
import { levelForXp, xpForRun } from '@/game/systems/progression';
import { utcDayKey } from '@/game/procedural/rng';
import type { GameMode, PlayerProfile, RunResult, RunStats } from '@/game/types';

/**
 * Merges a finished run into the persistent profile and works out every reward
 * it earned. Written as a pure function so the whole reward pipeline is unit
 * testable without a browser, a Phaser scene or a storage driver.
 */

export interface ApplyRunInput {
  profile: PlayerProfile;
  stats: RunStats;
  mode: GameMode;
  seed: string;
  /** Injected for deterministic tests. */
  now?: Date;
}

export interface ApplyRunOutput {
  profile: PlayerProfile;
  result: RunResult;
  unlockedCosmetics: CosmeticDefinition[];
  unlockedAchievements: AchievementDefinition[];
}

export function applyRunToProfile(input: ApplyRunInput): ApplyRunOutput {
  const { stats, mode, seed } = input;
  const now = input.now ?? new Date();
  const today = utcDayKey(now);
  const wasDaily = mode === 'daily';

  const previousBest = input.profile.bestScore;
  const levelBefore = input.profile.level;
  const xpGained = xpForRun(stats, wasDaily);

  const daysPlayed = input.profile.daysPlayed.includes(today)
    ? input.profile.daysPlayed
    : [...input.profile.daysPlayed, today];

  // Tutorial runs are practice: they never touch records, XP or the economy.
  const counts = mode !== 'tutorial';

  const merged: PlayerProfile = {
    ...input.profile,
    bestScore: counts ? Math.max(previousBest, stats.score) : previousBest,
    totalRuns: counts ? input.profile.totalRuns + 1 : input.profile.totalRuns,
    totalDistance: input.profile.totalDistance + Math.round(stats.distance),
    totalFragments: input.profile.totalFragments + stats.fragments,
    fragments: input.profile.fragments + stats.fragments,
    totalPerfectCaptures: input.profile.totalPerfectCaptures + stats.perfectCaptures,
    maxCombo: Math.max(input.profile.maxCombo, stats.maxCombo),
    totalPlaySeconds: input.profile.totalPlaySeconds + Math.round(stats.durationSeconds),
    nearMissTotal: input.profile.nearMissTotal + stats.nearMisses,
    daysPlayed: daysPlayed.slice(-400),
    xp: counts ? input.profile.xp + xpGained : input.profile.xp,
  };
  merged.level = levelForXp(merged.xp);

  if (wasDaily) {
    merged.bestDailyScore = Math.max(merged.bestDailyScore, stats.score);
    merged.lastDailyDate = today;
    merged.lastDailyBest = Math.max(
      input.profile.lastDailyDate === today ? input.profile.lastDailyBest : 0,
      stats.score,
    );
    // A daily counts as "completed" once the player reaches the first core;
    // this rewards showing up rather than raw skill.
    if (stats.coresReached > 0 && input.profile.lastDailyDate !== today) {
      merged.challengesCompleted = input.profile.challengesCompleted + 1;
    }
  }

  const achievementContext: AchievementContext = {
    run: stats,
    profile: merged,
    bestPerfectStreak: stats.bestPerfectStreak,
    wasDaily,
  };

  const states = evaluateAchievements(achievementContext, merged.achievements);
  const unlockedAchievements = newlyUnlocked(states, merged.achievements);
  const achievements: Record<string, number> = { ...merged.achievements };
  for (const state of states) {
    achievements[state.definition.id] = state.progress;
  }
  merged.achievements = achievements;

  // Cosmetics are evaluated *after* achievements so achievement-gated items can
  // unlock in the very same run that earned the achievement.
  const ownedCosmetics = [
    ...merged.unlockedSkins,
    ...merged.unlockedTrails,
    ...merged.unlockedThemes,
  ];
  const unlockedCosmetics = evaluateCosmeticUnlocks(
    unlockContextFromProfile(merged),
    ownedCosmetics,
  );

  for (const cosmetic of unlockedCosmetics) {
    if (cosmetic.category === 'skin') merged.unlockedSkins = [...merged.unlockedSkins, cosmetic.id];
    if (cosmetic.category === 'trail')
      merged.unlockedTrails = [...merged.unlockedTrails, cosmetic.id];
    if (cosmetic.category === 'theme')
      merged.unlockedThemes = [...merged.unlockedThemes, cosmetic.id];
  }

  const result: RunResult = {
    ...stats,
    isNewRecord: counts && stats.score > previousBest,
    previousBest,
    xpGained: counts ? xpGained : 0,
    levelBefore,
    levelAfter: merged.level,
    unlockedSkins: unlockedCosmetics.map((cosmetic) => cosmetic.id),
    unlockedAchievements: unlockedAchievements.map((achievement) => achievement.id),
    mode,
    seed,
  };

  return { profile: merged, result, unlockedCosmetics, unlockedAchievements };
}

/** Empty stats object, used to reset the HUD and to seed a new run. */
export function createEmptyRunStats(): RunStats {
  return {
    score: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    coresReached: 0,
    perfectCaptures: 0,
    bestPerfectStreak: 0,
    nearMisses: 0,
    fragments: 0,
    distance: 0,
    durationSeconds: 0,
    tier: 0,
    shieldActive: false,
    revivesUsed: 0,
  };
}
