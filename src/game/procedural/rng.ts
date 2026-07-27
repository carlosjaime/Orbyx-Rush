/**
 * Deterministic pseudo random number generation.
 *
 * The daily challenge, the reproducible QA seeds and the level generator all
 * depend on this being *exactly* reproducible across devices and browsers, so
 * we implement the algorithm ourselves instead of trusting `Math.random`.
 */

/** FNV-1a style 32 bit string hash used to turn a seed string into a number. */
export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // Final avalanche so short seeds ("a", "b") diverge immediately.
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** A seeded random source with a small, explicit surface. */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** True with probability `p`. */
  chance(p: number): boolean;
  /** Uniformly picks one element; throws on an empty list. */
  pick<T>(items: readonly T[]): T;
  /** Returns -1 or 1. */
  sign(): 1 | -1;
  /** Current internal state, for snapshot/restore in tests. */
  getState(): number;
  setState(state: number): void;
}

/**
 * mulberry32 — 32 bit state, excellent statistical quality for game use and
 * trivially portable, which is what determinism across platforms requires.
 */
export function createRng(seed: string | number): Rng {
  let state = (typeof seed === 'string' ? hashSeed(seed) : seed >>> 0) || 0x9e3779b9;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('Rng.pick called with an empty list');
      return items[Math.floor(next() * items.length)] as T;
    },
    sign: () => (next() < 0.5 ? -1 : 1),
    getState: () => state,
    setState: (value: number) => {
      state = value >>> 0;
    },
  };
}

/** UTC day key (`YYYY-MM-DD`) — the basis of the daily challenge seed. */
export function utcDayKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Milliseconds until the next UTC midnight, i.e. the next daily challenge. */
export function millisUntilNextUtcDay(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next - now.getTime());
}

/** Produces a short human-shareable random seed for normal endless runs. */
export function createRandomSeed(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
