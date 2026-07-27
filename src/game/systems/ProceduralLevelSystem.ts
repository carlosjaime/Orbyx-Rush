import * as Phaser from 'phaser';
import { WORLD } from '@/game/config/balance';
import { CoreEntity, type CoreColors } from '@/game/entities/CoreEntity';
import { HazardEntity } from '@/game/entities/HazardEntity';
import { PickupEntity } from '@/game/entities/PickupEntity';
import { ZoneEntity } from '@/game/entities/ZoneEntity';
import { LevelGenerator } from '@/game/procedural/levelGenerator';
import type { CaptureCandidate } from '@/game/systems/CaptureSystem';
import type { HazardProbe } from '@/game/systems/CollisionSystem';
import type { CoreSpec, TrackSegment } from '@/game/types';

/** Depth bands so every layer composites in a predictable order. */
export const DEPTH = {
  background: 0,
  zones: 10,
  coreGlow: 20,
  cores: 24,
  hazards: 30,
  pickups: 34,
  orbTrail: 40,
  orb: 42,
  particles: 50,
  floatingText: 60,
  overlay: 90,
} as const;

export interface LevelPalette {
  core: CoreColors;
  coreDecoy: CoreColors;
  hazard: number;
  hazardWarn: number;
  fragment: number;
  shield: number;
  zone: Record<string, number>;
}

/**
 * Streams the endless track: generates ahead of the camera, spawns entities,
 * and recycles everything that has fallen far enough behind.
 */
export class ProceduralLevelSystem {
  private readonly scene: Phaser.Scene;
  private readonly palette: LevelPalette;
  private generator: LevelGenerator;

  private readonly cores: CoreEntity[] = [];
  private readonly hazards: HazardEntity[] = [];
  private readonly pickups: PickupEntity[] = [];
  private readonly zones: ZoneEntity[] = [];
  private readonly segments: TrackSegment[] = [];

  /** How far above the camera new content is generated. */
  private static readonly GENERATE_AHEAD = WORLD.height * 1.6;
  /** How far below the camera content is destroyed. */
  private static readonly CULL_BEHIND = WORLD.height * 0.9;

  constructor(scene: Phaser.Scene, palette: LevelPalette, seed: string, peaceful = false) {
    this.scene = scene;
    this.palette = palette;
    this.generator = new LevelGenerator({ seed, peaceful });
  }

  /** Creates the starting core and returns it. */
  start(): CoreEntity {
    this.clear();
    const spec = this.generator.startCore;
    const entity = this.spawnCore(spec);
    return entity;
  }

  /** Restarts generation with a new seed, reusing the same entity pools. */
  restart(seed: string, peaceful = false): CoreEntity {
    this.generator = new LevelGenerator({ seed, peaceful });
    return this.start();
  }

  get seed(): string {
    return this.generator.seed;
  }

  private spawnCore(spec: CoreSpec): CoreEntity {
    const colors = spec.kind === 'decoy' ? this.palette.coreDecoy : this.palette.core;
    const entity = new CoreEntity(this.scene, spec, colors, DEPTH.cores);
    this.cores.push(entity);
    return entity;
  }

  /** Generates segments until the track extends far enough above the camera. */
  ensureGenerated(cameraTop: number, tier: number): void {
    let guard = 0;
    while (this.topCoreY > cameraTop - ProceduralLevelSystem.GENERATE_AHEAD && guard < 12) {
      guard += 1;
      const segment = this.generator.next(tier);
      this.segments.push(segment);
      this.spawnCore(segment.core);

      for (const hazardSpec of segment.hazards) {
        this.hazards.push(
          new HazardEntity(
            this.scene,
            hazardSpec,
            this.palette.hazard,
            this.palette.hazardWarn,
            DEPTH.hazards,
          ),
        );
      }
      for (const fragmentSpec of segment.fragments) {
        const color =
          fragmentSpec.payload === 'shield' ? this.palette.shield : this.palette.fragment;
        this.pickups.push(new PickupEntity(this.scene, fragmentSpec, color, DEPTH.pickups));
      }
      for (const zoneSpec of segment.zones) {
        const color = this.palette.zone[zoneSpec.kind] ?? this.palette.fragment;
        this.zones.push(new ZoneEntity(this.scene, zoneSpec, color, DEPTH.zones));
      }
    }
  }

  private get topCoreY(): number {
    let top = Number.POSITIVE_INFINITY;
    for (const core of this.cores) top = Math.min(top, core.spec.y);
    return top === Number.POSITIVE_INFINITY ? WORLD.height : top;
  }

  /** Destroys everything that has scrolled well below the camera. */
  cull(cameraTop: number, currentCoreId: number | null): void {
    const limit = cameraTop + WORLD.height + ProceduralLevelSystem.CULL_BEHIND;

    for (let i = this.cores.length - 1; i >= 0; i -= 1) {
      const core = this.cores[i]!;
      if (core.spec.y > limit && core.spec.id !== currentCoreId) {
        core.destroy();
        this.cores.splice(i, 1);
      }
    }
    for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
      const hazard = this.hazards[i]!;
      if (hazard.spec.y > limit) {
        hazard.destroy();
        this.hazards.splice(i, 1);
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = this.pickups[i]!;
      if (pickup.spec.y > limit || pickup.isCollected) {
        pickup.destroy();
        this.pickups.splice(i, 1);
      }
    }
    for (let i = this.zones.length - 1; i >= 0; i -= 1) {
      const zone = this.zones[i]!;
      if (zone.spec.y > limit) {
        zone.destroy();
        this.zones.splice(i, 1);
      }
    }
    while (this.segments.length > 0 && (this.segments[0]?.core.y ?? 0) > limit) {
      this.segments.shift();
    }
  }

  update(deltaSeconds: number): void {
    for (const core of this.cores) core.update(deltaSeconds);
    for (const hazard of this.hazards) hazard.update(deltaSeconds);
  }

  findCore(id: number): CoreEntity | undefined {
    return this.cores.find((core) => core.spec.id === id);
  }

  /** The next un-visited core above `y`, used for the targeting highlight. */
  nextTargetAbove(y: number): CoreEntity | null {
    let best: CoreEntity | null = null;
    for (const core of this.cores) {
      if (core.isCollapsed || core.wasVisited) continue;
      if (core.position.y >= y) continue;
      if (!best || core.position.y > best.position.y) best = core;
    }
    return best;
  }

  get captureCandidates(): CaptureCandidate[] {
    return this.cores.map((core) => ({
      id: core.spec.id,
      center: core.position,
      orbitRadius: core.orbitRadius,
      captureRadius: core.captureRadius,
      active: !core.isCollapsed,
    }));
  }

  get hazardProbes(): HazardProbe[] {
    return this.hazards.map((hazard) => {
      const [a, b] = hazard.segment;
      return {
        id: hazard.spec.id,
        a,
        b,
        thickness: hazard.thickness,
        lethal: hazard.isLethal,
      };
    });
  }

  get activePickups(): readonly PickupEntity[] {
    return this.pickups;
  }

  get activeZones(): readonly ZoneEntity[] {
    return this.zones;
  }

  get activeHazards(): readonly HazardEntity[] {
    return this.hazards;
  }

  get activeCores(): readonly CoreEntity[] {
    return this.cores;
  }

  findHazard(id: number): HazardEntity | undefined {
    return this.hazards.find((hazard) => hazard.spec.id === id);
  }

  clear(): void {
    for (const core of this.cores) core.destroy();
    for (const hazard of this.hazards) hazard.destroy();
    for (const pickup of this.pickups) pickup.destroy();
    for (const zone of this.zones) zone.destroy();
    this.cores.length = 0;
    this.hazards.length = 0;
    this.pickups.length = 0;
    this.zones.length = 0;
    this.segments.length = 0;
  }

  destroy(): void {
    this.clear();
  }
}
