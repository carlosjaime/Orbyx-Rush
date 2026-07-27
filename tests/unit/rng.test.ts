import { describe, expect, it } from 'vitest';
import {
  createRandomSeed,
  createRng,
  hashSeed,
  millisUntilNextUtcDay,
  utcDayKey,
} from '@/game/procedural/rng';

describe('hashSeed', () => {
  it('is deterministic', () => {
    expect(hashSeed('ORBYX')).toBe(hashSeed('ORBYX'));
  });

  it('diverges strongly for near-identical seeds', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
    expect(hashSeed('2026-01-01')).not.toBe(hashSeed('2026-01-02'));
  });

  it('produces an unsigned 32 bit value', () => {
    const value = hashSeed('anything at all');
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(2 ** 32);
    expect(Number.isInteger(value)).toBe(true);
  });
});

describe('createRng', () => {
  it('produces identical sequences for the same seed', () => {
    const a = createRng('ORBYX-DAILY-2026-05-01');
    const b = createRng('ORBYX-DAILY-2026-05-01');
    const left = Array.from({ length: 200 }, () => a.next());
    const right = Array.from({ length: 200 }, () => b.next());
    expect(left).toEqual(right);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng('seed-a');
    const b = createRng('seed-b');
    const left = Array.from({ length: 50 }, () => a.next());
    const right = Array.from({ length: 50 }, () => b.next());
    expect(left).not.toEqual(right);
  });

  it('keeps every value inside [0, 1)', () => {
    const rng = createRng(12345);
    for (let i = 0; i < 5000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('respects the bounds of range() and int()', () => {
    const rng = createRng('bounds');
    for (let i = 0; i < 2000; i += 1) {
      const float = rng.range(-5, 12);
      expect(float).toBeGreaterThanOrEqual(-5);
      expect(float).toBeLessThan(12);

      const integer = rng.int(3, 7);
      expect(Number.isInteger(integer)).toBe(true);
      expect(integer).toBeGreaterThanOrEqual(3);
      expect(integer).toBeLessThanOrEqual(7);
    }
  });

  it('distributes roughly uniformly', () => {
    const rng = createRng('uniform');
    const buckets = new Array(10).fill(0);
    const samples = 20000;
    for (let i = 0; i < samples; i += 1) {
      buckets[Math.floor(rng.next() * 10)] += 1;
    }
    for (const count of buckets) {
      // Each bucket should hold ~10%; allow a generous ±25% relative band.
      expect(count).toBeGreaterThan((samples / 10) * 0.75);
      expect(count).toBeLessThan((samples / 10) * 1.25);
    }
  });

  it('can snapshot and restore its state', () => {
    const rng = createRng('snapshot');
    rng.next();
    const state = rng.getState();
    const expected = [rng.next(), rng.next(), rng.next()];
    rng.setState(state);
    expect([rng.next(), rng.next(), rng.next()]).toEqual(expected);
  });

  it('throws on pick() with an empty list rather than returning undefined', () => {
    expect(() => createRng('x').pick([])).toThrow();
  });
});

describe('utcDayKey', () => {
  it('formats as YYYY-MM-DD in UTC', () => {
    expect(utcDayKey(new Date('2026-03-07T23:59:59Z'))).toBe('2026-03-07');
  });

  it('uses UTC, not local time', () => {
    // 00:30 UTC on the 8th is still the 7th in UTC-5, but the key must be UTC.
    expect(utcDayKey(new Date('2026-03-08T00:30:00Z'))).toBe('2026-03-08');
  });
});

describe('millisUntilNextUtcDay', () => {
  it('counts down to the next UTC midnight', () => {
    const remaining = millisUntilNextUtcDay(new Date('2026-03-07T23:00:00Z'));
    expect(remaining).toBe(60 * 60 * 1000);
  });

  it('is never negative', () => {
    expect(millisUntilNextUtcDay(new Date('2026-03-07T00:00:00Z'))).toBeGreaterThan(0);
  });
});

describe('createRandomSeed', () => {
  it('returns an 8 character uppercase alphanumeric seed', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(createRandomSeed()).toMatch(/^[A-Z2-9]{8}$/);
    }
  });
});
