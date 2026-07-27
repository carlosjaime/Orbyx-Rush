import { describe, expect, it } from 'vitest';
import {
  buildDemoLeaderboard,
  dailySeedFor,
  formatCountdown,
  readDailyState,
  recordDailyAttempt,
} from '@/game/systems/DailyChallengeSystem';

describe('dailySeedFor', () => {
  it('derives the seed purely from the UTC date', () => {
    expect(dailySeedFor(new Date('2026-02-14T00:00:01Z'))).toBe('ORBYX-DAILY-2026-02-14');
    expect(dailySeedFor(new Date('2026-02-14T23:59:59Z'))).toBe('ORBYX-DAILY-2026-02-14');
  });

  it('changes at UTC midnight', () => {
    expect(dailySeedFor(new Date('2026-02-14T23:59:59Z'))).not.toBe(
      dailySeedFor(new Date('2026-02-15T00:00:00Z')),
    );
  });
});

describe('readDailyState', () => {
  it('reports an empty state when the day has no history', () => {
    const state = readDailyState([], new Date('2026-02-14T12:00:00Z'));
    expect(state.date).toBe('2026-02-14');
    expect(state.bestScore).toBe(0);
    expect(state.attempts).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.millisRemaining).toBeGreaterThan(0);
  });

  it('reads back today’s record and ignores other days', () => {
    const history = [
      { date: '2026-02-13', bestScore: 999, attempts: 5, completed: true },
      { date: '2026-02-14', bestScore: 4200, attempts: 3, completed: true },
    ];
    const state = readDailyState(history, new Date('2026-02-14T12:00:00Z'));
    expect(state.bestScore).toBe(4200);
    expect(state.attempts).toBe(3);
  });
});

describe('recordDailyAttempt', () => {
  const now = new Date('2026-02-14T12:00:00Z');

  it('creates a record on the first attempt', () => {
    const history = recordDailyAttempt([], 1200, true, now);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      date: '2026-02-14',
      bestScore: 1200,
      attempts: 1,
      completed: true,
    });
  });

  it('keeps only the best score across attempts and counts them all', () => {
    let history = recordDailyAttempt([], 1200, true, now);
    history = recordDailyAttempt(history, 800, true, now);
    history = recordDailyAttempt(history, 3000, true, now);
    expect(history).toHaveLength(1);
    expect(history[0]?.bestScore).toBe(3000);
    expect(history[0]?.attempts).toBe(3);
  });

  it('never un-completes a day', () => {
    let history = recordDailyAttempt([], 500, true, now);
    history = recordDailyAttempt(history, 100, false, now);
    expect(history[0]?.completed).toBe(true);
  });

  it('does not disturb other days', () => {
    const previous = [{ date: '2026-02-13', bestScore: 700, attempts: 1, completed: true }];
    const history = recordDailyAttempt(previous, 100, false, now);
    expect(history).toHaveLength(2);
    expect(history.find((entry) => entry.date === '2026-02-13')?.bestScore).toBe(700);
  });

  it('caps the retained history at 60 days', () => {
    let history: ReturnType<typeof recordDailyAttempt> = [];
    for (let day = 0; day < 90; day += 1) {
      const date = new Date(Date.UTC(2026, 0, 1 + day, 12));
      history = recordDailyAttempt(history, day * 10, true, date);
    }
    expect(history.length).toBeLessThanOrEqual(60);
    // The most recent day must survive the trim.
    expect(history.at(-1)?.date).toBe('2026-03-31');
  });
});

describe('formatCountdown', () => {
  it('formats as HH:MM:SS with zero padding', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
    expect(formatCountdown(61_000)).toBe('00:01:01');
    expect(formatCountdown(3_723_000)).toBe('01:02:03');
  });

  it('never goes negative', () => {
    expect(formatCountdown(-50_000)).toBe('00:00:00');
  });
});

describe('buildDemoLeaderboard', () => {
  it('flags every synthetic entry as a demo', () => {
    const board = buildDemoLeaderboard(0, 'ORBYX-DAILY-2026-02-14');
    expect(board.length).toBeGreaterThan(0);
    expect(board.every((entry) => entry.isDemo)).toBe(true);
    expect(board.every((entry) => !entry.isPlayer)).toBe(true);
  });

  it('adds the real player entry, not flagged as demo', () => {
    const board = buildDemoLeaderboard(999999, 'ORBYX-DAILY-2026-02-14');
    const player = board.find((entry) => entry.isPlayer);
    expect(player).toBeDefined();
    expect(player?.isDemo).toBe(false);
    expect(player?.rank).toBe(1);
  });

  it('is deterministic per day so it does not reshuffle on re-render', () => {
    const a = buildDemoLeaderboard(1000, 'ORBYX-DAILY-2026-02-14');
    const b = buildDemoLeaderboard(1000, 'ORBYX-DAILY-2026-02-14');
    expect(a).toEqual(b);
  });

  it('ranks strictly by descending score', () => {
    const board = buildDemoLeaderboard(15000, 'ORBYX-DAILY-2026-02-14');
    for (let i = 1; i < board.length; i += 1) {
      expect(board[i]!.score).toBeLessThanOrEqual(board[i - 1]!.score);
      expect(board[i]!.rank).toBe(i + 1);
    }
  });
});
