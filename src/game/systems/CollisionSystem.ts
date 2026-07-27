import { HAZARDS, WORLD } from '@/game/config/balance';
import { distanceSegmentToSegment } from '@/game/physics/orbitMath';
import type { Vector2 } from '@/game/types';

/**
 * Hazard collision and near-miss detection.
 *
 * Uses swept point-vs-segment tests: the orb's movement between two frames is
 * itself treated as a segment, so a fast orb can never tunnel through a thin
 * laser beam at low frame rates.
 */

export interface HazardProbe {
  id: number;
  a: Vector2;
  b: Vector2;
  thickness: number;
  lethal: boolean;
}

export type CollisionResult =
  | { kind: 'none' }
  | { kind: 'hit'; hazardId: number; lethal: boolean }
  | { kind: 'near-miss'; hazardId: number; distance: number };

export class CollisionSystem {
  /** Hazards already credited as a near miss during the current flight. */
  private readonly creditedNearMisses = new Set<number>();

  resetFlight(): void {
    this.creditedNearMisses.clear();
  }

  /**
   * Tests one movement step. Returns every event that occurred, hits first so
   * the caller can stop processing as soon as it sees a lethal one.
   */
  check(
    from: Vector2,
    to: Vector2,
    orbRadius: number,
    hazards: readonly HazardProbe[],
  ): CollisionResult[] {
    const results: CollisionResult[] = [];

    for (const hazard of hazards) {
      const distance = this.segmentDistance(from, to, hazard);
      const hitDistance = orbRadius + hazard.thickness / 2;

      if (distance <= hitDistance) {
        if (hazard.lethal) {
          results.unshift({ kind: 'hit', hazardId: hazard.id, lethal: true });
        }
        continue;
      }

      if (
        distance <= hitDistance + HAZARDS.obstacle.nearMissRadius &&
        !this.creditedNearMisses.has(hazard.id)
      ) {
        this.creditedNearMisses.add(hazard.id);
        results.push({ kind: 'near-miss', hazardId: hazard.id, distance });
      }
    }

    return results;
  }

  /**
   * Minimum distance between the orb's swept path and a hazard segment.
   *
   * This must return 0 when the two segments cross: sampling endpoints alone
   * would miss a perpendicular crossing entirely and let a fast orb pass
   * straight through a bar.
   */
  private segmentDistance(from: Vector2, to: Vector2, hazard: HazardProbe): number {
    return distanceSegmentToSegment(from, to, hazard.a, hazard.b);
  }
}

export type BoundsFailure = 'void' | 'out-of-bounds' | null;

/**
 * Out-of-play detection.
 *
 * `cameraTop` is the world Y of the top of the viewport; the kill line trails
 * the camera so falling behind is always visible before it is fatal.
 */
export function checkBounds(position: Vector2, cameraTop: number): BoundsFailure {
  if (
    position.x < -WORLD.horizontalKillMargin ||
    position.x > WORLD.width + WORLD.horizontalKillMargin
  ) {
    return 'out-of-bounds';
  }
  if (position.y > cameraTop + WORLD.height + WORLD.voidKillMargin) {
    return 'void';
  }
  return null;
}
