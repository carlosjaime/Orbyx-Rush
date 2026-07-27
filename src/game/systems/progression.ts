import { PROGRESSION } from '@/game/config/balance';
import type { RunStats } from '@/game/types';

/**
 * XP and player levels.
 *
 * Levels only gate cosmetics and the (fragment-funded) revive charge; they
 * never grant a gameplay advantage, so the curve can stay generous early and
 * long in the tail without unbalancing the leaderboard.
 */

/** Cumulative XP required to *reach* the given level. Level 1 costs nothing. */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  const capped = Math.min(level, PROGRESSION.maxLevel);
  return Math.round(PROGRESSION.levelBase * Math.pow(capped - 1, PROGRESSION.levelExponent));
}

/** Resolves the level a given amount of cumulative XP corresponds to. */
export function levelForXp(xp: number): number {
  const total = Math.max(0, xp);
  let level = 1;
  while (level < PROGRESSION.maxLevel && total >= xpRequiredForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  ratio: number;
  isMaxLevel: boolean;
}

/** Everything the profile widget needs to draw a level bar. */
export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const isMaxLevel = level >= PROGRESSION.maxLevel;
  const floor = xpRequiredForLevel(level);
  const ceiling = isMaxLevel ? floor : xpRequiredForLevel(level + 1);
  const span = Math.max(1, ceiling - floor);
  const into = Math.max(0, Math.min(xp - floor, span));
  return {
    level,
    xpIntoLevel: into,
    xpForNextLevel: isMaxLevel ? 0 : span,
    ratio: isMaxLevel ? 1 : into / span,
    isMaxLevel,
  };
}

/** XP awarded by a finished run. */
export function xpForRun(stats: RunStats, wasDailyChallenge: boolean): number {
  const fromScore = stats.score / PROGRESSION.xpScoreDivisor;
  const fromPerfects = stats.perfectCaptures * PROGRESSION.xpPerPerfect;
  const fromCores = stats.coresReached * PROGRESSION.xpPerCoreReached;
  const dailyBonus = wasDailyChallenge ? PROGRESSION.xpDailyChallengeBonus : 0;
  return Math.max(1, Math.round(fromScore + fromPerfects + fromCores + dailyBonus));
}
