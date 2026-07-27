import { DIFFICULTY, HAZARDS, ORBIT, POWERUPS, WORLD, clamp } from '@/game/config/balance';
import { snapshotForTier, type DifficultySnapshot } from '@/game/systems/DifficultySystem';
import { createRng, type Rng } from '@/game/procedural/rng';
import {
  captureRadiusOf,
  distanceToClosestHazard,
  evaluateReachability,
  hazardKeepsSegmentSolvable,
} from '@/game/procedural/reachability';
import type {
  CoreSpec,
  FragmentSpec,
  HazardSpec,
  TrackSegment,
  Vector2,
  ZoneSpec,
} from '@/game/types';

/**
 * Endless track generator.
 *
 * Contract: `next()` never returns a segment that has not been proven solvable
 * by `evaluateReachability`. Placement is attempted with progressively relaxed
 * parameters and, in the pathological case, falls back to a guaranteed-safe
 * straight-ahead core.
 */

const MAX_PLACEMENT_ATTEMPTS = 24;
const MAX_HAZARD_ATTEMPTS = 8;
const FRAGMENT_HAZARD_CLEARANCE = 46;

export interface GeneratorOptions {
  seed: string;
  /** Overrides the tier used for every segment (tutorial / QA runs). */
  fixedTier?: number;
  /** Disables all hazards — used by the tutorial. */
  peaceful?: boolean;
}

export class LevelGenerator {
  private readonly rng: Rng;
  private readonly options: GeneratorOptions;
  private nextId = 1;
  private segmentIndex = 0;
  private lastCore: CoreSpec;

  constructor(options: GeneratorOptions) {
    this.options = options;
    this.rng = createRng(options.seed);
    this.lastCore = this.createStartCore();
  }

  /** The core the player starts attached to. Always safe and generous. */
  get startCore(): CoreSpec {
    return this.lastCore;
  }

  get seed(): string {
    return this.options.seed;
  }

  private createStartCore(): CoreSpec {
    return {
      id: this.nextId++,
      x: WORLD.width / 2,
      y: WORLD.height * 0.72,
      kind: 'anchor',
      orbitRadius: DIFFICULTY.orbitRadius.start,
      angularSpeed: ORBIT.baseAngularSpeed,
      spin: 1,
    };
  }

  /** Generates the next segment of the track. */
  next(tier: number): TrackSegment {
    const difficulty = snapshotForTier(this.options.fixedTier ?? tier);
    const core = this.placeCore(difficulty);
    const hazards = this.options.peaceful ? [] : this.placeHazards(this.lastCore, core, difficulty);
    const fragments = this.placeFragments(this.lastCore, core, hazards, difficulty);
    const zones = this.options.peaceful ? [] : this.placeZones(this.lastCore, core, difficulty);

    this.lastCore = core;
    const segment: TrackSegment = {
      index: this.segmentIndex++,
      core,
      hazards,
      fragments,
      zones,
      tier: difficulty.tier,
    };
    return segment;
  }

  // ---------------------------------------------------------------- cores ---

  private placeCore(difficulty: DifficultySnapshot): CoreSpec {
    const previous = this.lastCore;

    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
      // Relax the layout the longer we struggle: shorter gaps, bigger orbits.
      const relax = attempt / MAX_PLACEMENT_ATTEMPTS;
      const candidate = this.candidateCore(previous, difficulty, relax);
      const report = evaluateReachability(previous, candidate, {
        launchSpeed: difficulty.launchSpeed,
        hazards: [],
        precisionMargin: 0.62 + relax * 0.2,
      });
      if (report.reachable) return candidate;
    }

    return this.fallbackCore(previous, difficulty);
  }

  private candidateCore(
    previous: CoreSpec,
    difficulty: DifficultySnapshot,
    relax: number,
  ): CoreSpec {
    const gapY = difficulty.gapY * (1 - relax * 0.35) * this.rng.range(0.86, 1.14);
    const maxGapX = difficulty.gapX * (1 - relax * 0.45);
    const offsetX = this.rng.range(-maxGapX, maxGapX);

    const orbitRadius = clamp(
      difficulty.orbitRadius * this.rng.range(0.88, 1.18) * (1 + relax * 0.3),
      ORBIT.minRadius,
      ORBIT.maxRadius,
    );

    const minX = WORLD.sideMargin + orbitRadius;
    const maxX = WORLD.width - WORLD.sideMargin - orbitRadius;
    const x = clamp(previous.x + offsetX, minX, maxX);
    const y = previous.y - gapY;

    const core: CoreSpec = {
      id: this.nextId++,
      x,
      y,
      kind: 'standard',
      orbitRadius,
      angularSpeed: difficulty.angularSpeed * this.rng.range(0.9, 1.12),
      spin: this.rng.chance(difficulty.reverseCoreChance) ? -1 : 1,
    };

    this.decorateCore(core, difficulty, relax);
    return core;
  }

  private decorateCore(core: CoreSpec, difficulty: DifficultySnapshot, relax: number): void {
    // Only one special behaviour per core: stacking them reads as noise.
    if (relax > 0.5) return;

    if (this.rng.chance(difficulty.movingCoreChance)) {
      const room = Math.min(
        core.x - (WORLD.sideMargin + core.orbitRadius),
        WORLD.width - WORLD.sideMargin - core.orbitRadius - core.x,
      );
      const amplitude = clamp(
        this.rng.range(HAZARDS.movingCore.minAmplitude, HAZARDS.movingCore.maxAmplitude),
        0,
        Math.max(0, room),
      );
      if (amplitude > HAZARDS.movingCore.minAmplitude * 0.5) {
        core.kind = 'moving';
        core.motion = {
          amplitude,
          period: this.rng.range(HAZARDS.movingCore.minPeriod, HAZARDS.movingCore.maxPeriod),
          phase: this.rng.range(0, Math.PI * 2),
          axis: 'x',
        };
        return;
      }
    }

    if (this.rng.chance(difficulty.pulsingCoreChance)) {
      core.kind = 'pulsing';
      core.pulse = {
        amplitude: HAZARDS.pulsingCore.amplitude,
        period: HAZARDS.pulsingCore.period,
        phase: this.rng.range(0, Math.PI * 2),
      };
      return;
    }

    if (this.rng.chance(difficulty.decoyCoreChance)) {
      core.kind = 'decoy';
      core.decoy = true;
      return;
    }

    if (core.spin === -1) core.kind = 'reverse';
  }

  /** Guaranteed-solvable placement used when random attempts keep failing. */
  private fallbackCore(previous: CoreSpec, difficulty: DifficultySnapshot): CoreSpec {
    const orbitRadius = clamp(difficulty.orbitRadius * 1.25, ORBIT.minRadius, ORBIT.maxRadius);
    return {
      id: this.nextId++,
      x: clamp(
        previous.x,
        WORLD.sideMargin + orbitRadius,
        WORLD.width - WORLD.sideMargin - orbitRadius,
      ),
      y: previous.y - DIFFICULTY.gapY.start,
      kind: 'standard',
      orbitRadius,
      angularSpeed: ORBIT.baseAngularSpeed,
      spin: previous.spin,
    };
  }

  // -------------------------------------------------------------- hazards ---

  private placeHazards(from: CoreSpec, to: CoreSpec, difficulty: DifficultySnapshot): HazardSpec[] {
    if (!this.rng.chance(difficulty.obstacleChance)) return [];

    const accepted: HazardSpec[] = [];
    const desired = difficulty.tier >= DIFFICULTY.unlockTier.laser && this.rng.chance(0.35) ? 2 : 1;

    for (let i = 0; i < desired; i += 1) {
      for (let attempt = 0; attempt < MAX_HAZARD_ATTEMPTS; attempt += 1) {
        const hazard = this.candidateHazard(from, to, difficulty);
        const trial = [...accepted, hazard];
        // A hazard is only accepted if the segment stays provably solvable.
        if (
          hazardKeepsSegmentSolvable(from, to, trial, {
            launchSpeed: difficulty.launchSpeed,
            precisionMargin: 0.6,
          })
        ) {
          accepted.push(hazard);
          break;
        }
      }
    }

    return accepted;
  }

  private candidateHazard(
    from: CoreSpec,
    to: CoreSpec,
    difficulty: DifficultySnapshot,
  ): HazardSpec {
    const kind = difficulty.laserUnlocked && this.rng.chance(0.3) ? 'laser' : 'bar';
    const t = this.rng.range(0.32, 0.72);
    const midX = from.x + (to.x - from.x) * t;
    const midY = from.y + (to.y - from.y) * t;
    const lateral = this.rng.range(-190, 190);

    const length =
      kind === 'laser'
        ? this.rng.range(220, 420)
        : this.rng.range(HAZARDS.obstacle.minLength, HAZARDS.obstacle.maxLength);

    return {
      id: this.nextId++,
      kind,
      x: clamp(midX + lateral, WORLD.sideMargin * 0.5, WORLD.width - WORLD.sideMargin * 0.5),
      y: midY,
      length,
      thickness: kind === 'laser' ? HAZARDS.laser.thickness : HAZARDS.obstacle.thickness,
      angle: this.rng.range(0, Math.PI),
      spin:
        kind === 'laser'
          ? 0
          : this.rng.range(HAZARDS.obstacle.minSpin, HAZARDS.obstacle.maxSpin) *
            Math.min(1, difficulty.t * 1.6),
      phase: this.rng.range(0, HAZARDS.laser.onDuration + HAZARDS.laser.offDuration),
    };
  }

  // ------------------------------------------------------------ pickups ---

  private placeFragments(
    from: CoreSpec,
    to: CoreSpec,
    hazards: readonly HazardSpec[],
    difficulty: DifficultySnapshot,
  ): FragmentSpec[] {
    if (!this.rng.chance(difficulty.fragmentChance)) return [];

    const fragments: FragmentSpec[] = [];
    const count = this.rng.int(1, 3);

    for (let i = 0; i < count; i += 1) {
      const t = (i + 1) / (count + 1);
      const jitter = this.rng.range(-70, 70);
      const point: Vector2 = {
        x: clamp(
          from.x + (to.x - from.x) * t + jitter,
          WORLD.sideMargin,
          WORLD.width - WORLD.sideMargin,
        ),
        y: from.y + (to.y - from.y) * t + this.rng.range(-40, 40),
      };
      // Never bait the player into a hazard they cannot see coming.
      if (distanceToClosestHazard(point, hazards) < FRAGMENT_HAZARD_CLEARANCE) continue;
      fragments.push({
        id: this.nextId++,
        x: point.x,
        y: point.y,
        payload: this.rng.chance(POWERUPS.shield.spawnChance) ? 'shield' : 'fragment',
      });
    }

    return fragments;
  }

  private placeZones(from: CoreSpec, to: CoreSpec, difficulty: DifficultySnapshot): ZoneSpec[] {
    if (!this.rng.chance(difficulty.zoneChance)) return [];

    const kinds: ZoneSpec['kind'][] = difficulty.portalUnlocked
      ? ['slow', 'boost', 'gravity', 'portal']
      : ['slow', 'boost', 'gravity'];
    const kind = this.rng.pick(kinds);
    const t = this.rng.range(0.35, 0.65);
    const x = clamp(
      from.x + (to.x - from.x) * t + this.rng.range(-120, 120),
      WORLD.sideMargin,
      WORLD.width - WORLD.sideMargin,
    );
    const y = from.y + (to.y - from.y) * t;

    const zone: ZoneSpec = {
      id: this.nextId++,
      kind,
      x,
      y,
      radius: kind === 'portal' ? 74 : this.rng.range(96, 150),
    };

    if (kind === 'portal') {
      // The exit stays on the way to the target so a portal never teleports the
      // player into an unreachable pocket.
      zone.destination = {
        x: clamp(
          to.x + this.rng.range(-130, 130),
          WORLD.sideMargin,
          WORLD.width - WORLD.sideMargin,
        ),
        y: y - this.rng.range(140, 260),
      };
    }

    return [zone];
  }
}

/**
 * Generates a whole track up-front. Used by tests, the daily-challenge preview
 * and the reachability audit; the live game streams segments lazily instead.
 */
export function generateTrack(options: GeneratorOptions, segments: number): TrackSegment[] {
  const generator = new LevelGenerator(options);
  const out: TrackSegment[] = [];
  let previous = generator.startCore;
  for (let i = 0; i < segments; i += 1) {
    const segment = generator.next(i / 4);
    out.push(segment);
    previous = segment.core;
  }
  void previous;
  return out;
}

/** Verifies an entire generated track. Used by the unit tests as a guard rail. */
export function auditTrack(
  startCore: CoreSpec,
  segments: readonly TrackSegment[],
): { ok: boolean; failures: number[] } {
  const failures: number[] = [];
  let previous = startCore;
  for (const segment of segments) {
    const difficulty = snapshotForTier(segment.tier);
    const report = evaluateReachability(previous, segment.core, {
      launchSpeed: difficulty.launchSpeed,
      hazards: segment.hazards,
      precisionMargin: 0.85,
    });
    if (!report.reachable) failures.push(segment.index);
    previous = segment.core;
  }
  return { ok: failures.length === 0, failures };
}

export { captureRadiusOf };
