import { describe, expect, it } from 'vitest';
import { DIFFICULTY, LAUNCH, ORBIT } from '@/game/config/balance';
import { DifficultySystem, computeTier, snapshotForTier } from '@/game/systems/DifficultySystem';

describe('computeTier', () => {
  it('starts at zero for a brand new run', () => {
    expect(computeTier(0, 0)).toBe(0);
  });

  it('increases monotonically with cores reached', () => {
    let previous = -1;
    for (let cores = 0; cores <= 80; cores += 4) {
      const tier = computeTier(cores, 0);
      expect(tier).toBeGreaterThanOrEqual(previous);
      previous = tier;
    }
  });

  it('increases monotonically with time survived', () => {
    let previous = -1;
    for (let seconds = 0; seconds <= 300; seconds += 15) {
      const tier = computeTier(0, seconds);
      expect(tier).toBeGreaterThanOrEqual(previous);
      previous = tier;
    }
  });

  it('never exceeds the configured maximum', () => {
    expect(computeTier(100000, 100000)).toBeLessThanOrEqual(DIFFICULTY.maxTier);
  });

  it('ramps faster early than late (logarithmic flattening)', () => {
    const early = computeTier(6, 22) - computeTier(0, 0);
    const late = computeTier(66, 242) - computeTier(60, 220);
    expect(early).toBeGreaterThan(late);
  });

  it('cannot be stalled by camping: time alone still advances the tier', () => {
    expect(computeTier(0, 120)).toBeGreaterThan(0);
  });
});

describe('snapshotForTier', () => {
  it('keeps every derived value inside its configured clamp', () => {
    for (let tier = 0; tier <= DIFFICULTY.maxTier; tier += 0.5) {
      const snapshot = snapshotForTier(tier);
      expect(snapshot.orbitRadius).toBeGreaterThanOrEqual(ORBIT.minRadius);
      expect(snapshot.orbitRadius).toBeLessThanOrEqual(ORBIT.maxRadius);
      expect(snapshot.angularSpeed).toBeGreaterThanOrEqual(ORBIT.minAngularSpeed);
      expect(snapshot.angularSpeed).toBeLessThanOrEqual(ORBIT.maxAngularSpeed);
      expect(snapshot.launchSpeed).toBeGreaterThanOrEqual(LAUNCH.minSpeed);
      expect(snapshot.launchSpeed).toBeLessThanOrEqual(LAUNCH.maxSpeed);
      for (const chance of [
        snapshot.obstacleChance,
        snapshot.movingCoreChance,
        snapshot.pulsingCoreChance,
        snapshot.decoyCoreChance,
        snapshot.zoneChance,
        snapshot.fragmentChance,
      ]) {
        expect(chance).toBeGreaterThanOrEqual(0);
        expect(chance).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gates hazards behind their unlock tiers', () => {
    const start = snapshotForTier(0);
    expect(start.obstacleChance).toBe(0);
    expect(start.movingCoreChance).toBe(0);
    expect(start.zoneChance).toBe(0);
    expect(start.laserUnlocked).toBe(false);
    expect(start.portalUnlocked).toBe(false);

    const late = snapshotForTier(DIFFICULTY.maxTier);
    expect(late.obstacleChance).toBeGreaterThan(0);
    expect(late.laserUnlocked).toBe(true);
    expect(late.portalUnlocked).toBe(true);
  });

  it('shrinks the orbit radius as difficulty rises', () => {
    expect(snapshotForTier(DIFFICULTY.maxTier).orbitRadius).toBeLessThan(
      snapshotForTier(0).orbitRadius,
    );
  });

  it('clamps out-of-range tiers instead of extrapolating', () => {
    expect(snapshotForTier(-5)).toEqual(snapshotForTier(0));
    expect(snapshotForTier(DIFFICULTY.maxTier + 20)).toEqual(snapshotForTier(DIFFICULTY.maxTier));
  });
});

describe('DifficultySystem', () => {
  it('advances with both time and cores, and resets to zero', () => {
    const system = new DifficultySystem();
    system.reset();
    expect(system.tier).toBe(0);

    for (let i = 0; i < 20; i += 1) {
      system.update(1);
      system.registerCore();
    }
    expect(system.tier).toBeGreaterThan(0);

    system.reset();
    expect(system.tier).toBe(0);
  });

  it('honours a forced tier for the tutorial and QA runs', () => {
    const system = new DifficultySystem();
    system.forceTier(4);
    system.update(500);
    system.registerCore();
    expect(system.tier).toBe(4);

    system.forceTier(null);
    expect(system.tier).toBeGreaterThan(0);
  });
});
