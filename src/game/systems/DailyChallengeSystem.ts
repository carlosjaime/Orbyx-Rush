import { millisUntilNextUtcDay, utcDayKey } from '@/game/procedural/rng';
import type { DailyChallengeRecord } from '@/services/persistence/schema';

/**
 * Daily challenge.
 *
 * The seed is derived purely from the UTC date, so every player in the world
 * gets byte-identical cores, hazards and pickups for a given day, with no
 * server involved. Attempts are unlimited and nothing is ever sold.
 */

const SEED_PREFIX = 'ORBYX-DAILY';

/** Deterministic seed for a given UTC day. */
export function dailySeedFor(date: Date = new Date()): string {
  return `${SEED_PREFIX}-${utcDayKey(date)}`;
}

export interface DailyChallengeState {
  date: string;
  seed: string;
  bestScore: number;
  attempts: number;
  completed: boolean;
  /** Milliseconds until the challenge rotates. */
  millisRemaining: number;
}

export function readDailyState(
  history: readonly DailyChallengeRecord[],
  now: Date = new Date(),
): DailyChallengeState {
  const date = utcDayKey(now);
  const record = history.find((entry) => entry.date === date);
  return {
    date,
    seed: dailySeedFor(now),
    bestScore: record?.bestScore ?? 0,
    attempts: record?.attempts ?? 0,
    completed: record?.completed ?? false,
    millisRemaining: millisUntilNextUtcDay(now),
  };
}

/** Immutably records a finished daily attempt. Keeps the last 60 days. */
export function recordDailyAttempt(
  history: readonly DailyChallengeRecord[],
  score: number,
  reachedFirstCore: boolean,
  now: Date = new Date(),
): DailyChallengeRecord[] {
  const date = utcDayKey(now);
  const existing = history.find((entry) => entry.date === date);
  const updated: DailyChallengeRecord = {
    date,
    bestScore: Math.max(existing?.bestScore ?? 0, Math.max(0, Math.round(score))),
    attempts: (existing?.attempts ?? 0) + 1,
    completed: (existing?.completed ?? false) || reachedFirstCore,
  };
  const others = history.filter((entry) => entry.date !== date);
  return [...others, updated].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
}

/** Human readable countdown, e.g. `07:42:11`. */
export function formatCountdown(millis: number): string {
  const total = Math.max(0, Math.floor(millis / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  /** Always true in this release — there is no remote leaderboard yet. */
  isDemo: boolean;
  isPlayer: boolean;
}

/**
 * Local, clearly-labelled demonstration leaderboard.
 *
 * These are *not* real players. The names are obviously synthetic and every
 * entry is flagged `isDemo` so the UI can say so out loud. The shape matches
 * what a future remote endpoint would return, so swapping in a real backend is
 * a one-file change.
 */
export function buildDemoLeaderboard(playerScore: number, seed: string): LeaderboardEntry[] {
  const demoNames = [
    'ORB-ALFA',
    'ORB-BETA',
    'ORB-GAMMA',
    'ORB-DELTA',
    'ORB-EPSILON',
    'ORB-ZETA',
    'ORB-ETA',
  ];
  // Deterministic per-day targets so the board does not reshuffle on re-render.
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;

  const entries = demoNames.map((name, index) => ({
    name,
    score: 6000 + ((hash >> (index % 12)) % 9000) + (demoNames.length - index) * 2600,
    isDemo: true,
    isPlayer: false,
  }));

  if (playerScore > 0) {
    entries.push({ name: 'TÚ', score: Math.round(playerScore), isDemo: false, isPlayer: true });
  }

  return entries
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/** Future remote leaderboard contract. Intentionally unimplemented in v1. */
export interface LeaderboardProvider {
  readonly id: string;
  fetchDaily(date: string): Promise<LeaderboardEntry[]>;
  submitDaily(date: string, score: number): Promise<void>;
}

export class LocalDemoLeaderboardProvider implements LeaderboardProvider {
  readonly id = 'local-demo';

  constructor(private readonly getPlayerScore: () => number) {}

  async fetchDaily(date: string): Promise<LeaderboardEntry[]> {
    return buildDemoLeaderboard(this.getPlayerScore(), date);
  }

  async submitDaily(): Promise<void> {
    // No-op: scores stay on device until a real backend exists.
  }
}
