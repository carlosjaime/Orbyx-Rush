import { describe, expect, it } from 'vitest';
import { ORBIT, WORLD } from '@/game/config/balance';
import { LevelGenerator, auditTrack } from '@/game/procedural/levelGenerator';
import { evaluateReachability, hazardSegment } from '@/game/procedural/reachability';
import { distancePointToSegment } from '@/game/physics/orbitMath';
import { dailySeedFor } from '@/game/systems/DailyChallengeSystem';
import type { TrackSegment } from '@/game/types';

function generate(seed: string, count: number, peaceful = false) {
  const generator = new LevelGenerator({ seed, peaceful });
  const start = generator.startCore;
  const segments: TrackSegment[] = [];
  for (let i = 0; i < count; i += 1) {
    // Ramp the tier the way a real run does.
    segments.push(generator.next((i / count) * 10));
  }
  return { start, segments };
}

describe('LevelGenerator determinism', () => {
  it('produces byte-identical tracks for the same seed', () => {
    const a = generate('ORBYX-TEST-SEED', 40);
    const b = generate('ORBYX-TEST-SEED', 40);
    expect(JSON.stringify(a.segments)).toBe(JSON.stringify(b.segments));
  });

  it('produces different tracks for different seeds', () => {
    const a = generate('SEED-ONE', 30);
    const b = generate('SEED-TWO', 30);
    expect(JSON.stringify(a.segments)).not.toBe(JSON.stringify(b.segments));
  });

  it('gives every player the same daily challenge track', () => {
    const date = new Date('2026-06-15T12:00:00Z');
    const seed = dailySeedFor(date);
    expect(seed).toBe('ORBYX-DAILY-2026-06-15');
    expect(JSON.stringify(generate(seed, 25).segments)).toBe(
      JSON.stringify(generate(dailySeedFor(date), 25).segments),
    );
  });
});

describe('LevelGenerator solvability', () => {
  const seeds = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'ORBYX-DAILY-2026-01-01'];

  it('never emits an unreachable segment', () => {
    for (const seed of seeds) {
      const { start, segments } = generate(seed, 60);
      const audit = auditTrack(start, segments);
      expect(
        audit.ok,
        `seed ${seed} produced unreachable segments: ${audit.failures.join(', ')}`,
      ).toBe(true);
    }
  });

  it('leaves at least one hazard-free launch solution on every segment', () => {
    for (const seed of seeds) {
      const { start, segments } = generate(seed, 50);
      let previous = start;
      for (const segment of segments) {
        const report = evaluateReachability(previous, segment.core, {
          hazards: segment.hazards,
          launchSpeed: 900,
          precisionMargin: 0.85,
        });
        expect(report.viableSolutions.length).toBeGreaterThan(0);
        previous = segment.core;
      }
    }
  });

  it('keeps every core inside the playable field', () => {
    for (const seed of seeds) {
      const { segments } = generate(seed, 60);
      for (const segment of segments) {
        const { core } = segment;
        expect(core.x - core.orbitRadius).toBeGreaterThanOrEqual(0);
        expect(core.x + core.orbitRadius).toBeLessThanOrEqual(WORLD.width);
        expect(core.orbitRadius).toBeGreaterThanOrEqual(ORBIT.minRadius);
        expect(core.orbitRadius).toBeLessThanOrEqual(ORBIT.maxRadius);
      }
    }
  });

  it('keeps a moving core inside the field across its whole travel', () => {
    for (const seed of seeds) {
      const { segments } = generate(seed, 80);
      for (const { core } of segments) {
        if (!core.motion || core.motion.axis !== 'x') continue;
        const left = core.x - core.motion.amplitude - core.orbitRadius;
        const right = core.x + core.motion.amplitude + core.orbitRadius;
        expect(left).toBeGreaterThanOrEqual(0);
        expect(right).toBeLessThanOrEqual(WORLD.width);
      }
    }
  });

  it('always advances upward, never sideways or backwards', () => {
    const { start, segments } = generate('UPWARD', 60);
    let previousY = start.y;
    for (const segment of segments) {
      expect(segment.core.y).toBeLessThan(previousY);
      previousY = segment.core.y;
    }
  });

  it('never places a fragment inside a hazard', () => {
    for (const seed of seeds) {
      const { segments } = generate(seed, 60);
      for (const segment of segments) {
        for (const fragment of segment.fragments) {
          for (const hazard of segment.hazards) {
            const [a, b] = hazardSegment(hazard);
            const distance = distancePointToSegment(fragment, a, b) - hazard.thickness / 2;
            expect(distance).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('keeps portal exits inside the field', () => {
    for (const seed of seeds) {
      const { segments } = generate(seed, 80);
      for (const segment of segments) {
        for (const zone of segment.zones) {
          if (!zone.destination) continue;
          expect(zone.destination.x).toBeGreaterThanOrEqual(0);
          expect(zone.destination.x).toBeLessThanOrEqual(WORLD.width);
        }
      }
    }
  });
});

describe('LevelGenerator difficulty response', () => {
  it('spawns no hazards at all in peaceful (tutorial) mode', () => {
    const { segments } = generate('TUTORIAL', 30, true);
    for (const segment of segments) {
      expect(segment.hazards).toHaveLength(0);
      expect(segment.zones).toHaveLength(0);
    }
  });

  it('introduces hazards only after the unlock tier', () => {
    const generator = new LevelGenerator({ seed: 'HAZARD-GATE' });
    let hazardsAtTierZero = 0;
    for (let i = 0; i < 40; i += 1) {
      hazardsAtTierZero += generator.next(0).hazards.length;
    }
    expect(hazardsAtTierZero).toBe(0);
  });

  it('produces more hazards at high tiers than at low tiers', () => {
    const countHazards = (tier: number) => {
      const generator = new LevelGenerator({ seed: 'HAZARD-DENSITY' });
      let total = 0;
      for (let i = 0; i < 60; i += 1) total += generator.next(tier).hazards.length;
      return total;
    };
    expect(countHazards(9)).toBeGreaterThan(countHazards(2));
  });
});
