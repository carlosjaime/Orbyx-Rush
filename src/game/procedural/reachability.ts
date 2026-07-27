import { LAUNCH, ORBIT, WORLD } from '@/game/config/balance';
import {
  distancePointToSegment,
  distanceSegmentToSegment,
  findLaunchSolutions,
  type LaunchSolution,
} from '@/game/physics/orbitMath';
import type { CoreSpec, HazardSpec, Vector2 } from '@/game/types';

/**
 * Proves — before anything is rendered — that a generated segment can actually
 * be cleared. An arcade game that spawns impossible layouts feels broken, not
 * hard, so every candidate placement goes through this module.
 */

export interface ReachabilityOptions {
  /** Travel speed available to the player at this difficulty. */
  launchSpeed: number;
  /** Hazards already committed to the world that the flight must avoid. */
  hazards: readonly HazardSpec[];
  /**
   * Extra clearance demanded around hazards, on top of the orb radius. Higher
   * values mean easier, more forgiving tracks.
   */
  hazardClearance: number;
  /** Fraction of the capture radius a solution must land inside to count. */
  precisionMargin: number;
}

export interface ReachabilityReport {
  reachable: boolean;
  /** Every geometric solution, best first. */
  solutions: LaunchSolution[];
  /** Solutions that are also in-bounds, in time and hazard-free. */
  viableSolutions: LaunchSolution[];
  reason?:
    | 'too-close'
    | 'too-far'
    | 'no-tangent'
    | 'out-of-bounds'
    | 'blocked'
    | 'flight-too-long'
    | 'precision';
}

export const DEFAULT_REACHABILITY_OPTIONS: ReachabilityOptions = {
  launchSpeed: LAUNCH.baseSpeed,
  hazards: [],
  hazardClearance: 34,
  precisionMargin: 0.62,
};

/** Capture radius derived from a core's orbit radius. */
export function captureRadiusOf(core: Pick<CoreSpec, 'orbitRadius'>): number {
  return core.orbitRadius * ORBIT.captureRadiusFactor;
}

/** Worst-case centre positions for a core, accounting for its motion. */
export function coreExtremes(core: CoreSpec): Vector2[] {
  if (!core.motion) return [{ x: core.x, y: core.y }];
  const { amplitude, axis } = core.motion;
  if (axis === 'x') {
    return [
      { x: core.x - amplitude, y: core.y },
      { x: core.x, y: core.y },
      { x: core.x + amplitude, y: core.y },
    ];
  }
  return [
    { x: core.x, y: core.y - amplitude },
    { x: core.x, y: core.y },
    { x: core.x, y: core.y + amplitude },
  ];
}

/** Endpoints of a hazard bar/laser in world space. */
export function hazardSegment(hazard: HazardSpec): [Vector2, Vector2] {
  const half = hazard.length / 2;
  const dx = Math.cos(hazard.angle) * half;
  const dy = Math.sin(hazard.angle) * half;
  return [
    { x: hazard.x - dx, y: hazard.y - dy },
    { x: hazard.x + dx, y: hazard.y + dy },
  ];
}

function isInsideHorizontalBounds(point: Vector2): boolean {
  return (
    point.x >= -WORLD.horizontalKillMargin && point.x <= WORLD.width + WORLD.horizontalKillMargin
  );
}

/** True when a straight flight keeps a safe distance from every hazard. */
export function isPathClear(
  from: Vector2,
  to: Vector2,
  hazards: readonly HazardSpec[],
  clearance: number,
): boolean {
  for (const hazard of hazards) {
    const [a, b] = hazardSegment(hazard);
    const required = clearance + hazard.thickness / 2;
    if (distanceSegmentToSegment(from, to, a, b) < required) return false;
  }
  return true;
}

/**
 * Full reachability report from one core's orbit to the next core.
 *
 * The check is intentionally conservative: it uses the *worst* position a
 * moving target can occupy and demands the solution land well inside the
 * capture ring rather than grazing its edge.
 */
export function evaluateReachability(
  from: CoreSpec,
  to: CoreSpec,
  options: Partial<ReachabilityOptions> = {},
): ReachabilityReport {
  const opts = { ...DEFAULT_REACHABILITY_OPTIONS, ...options };
  const origin: Vector2 = { x: from.x, y: from.y };
  const maxTravel = opts.launchSpeed * LAUNCH.maxFlightTime;
  const targetCaptureRadius = captureRadiusOf(to);
  const requiredMiss = targetCaptureRadius * opts.precisionMargin;

  const targets = coreExtremes(to);
  const perTargetViable: LaunchSolution[][] = [];
  let allSolutions: LaunchSolution[] = [];
  let lastReason: ReachabilityReport['reason'];

  for (const target of targets) {
    const centreDistance = Math.hypot(target.x - origin.x, target.y - origin.y);
    if (centreDistance <= from.orbitRadius + to.orbitRadius * 0.55) {
      return { reachable: false, solutions: [], viableSolutions: [], reason: 'too-close' };
    }
    if (centreDistance > maxTravel) {
      return { reachable: false, solutions: [], viableSolutions: [], reason: 'too-far' };
    }

    const solutions = findLaunchSolutions(origin, from.orbitRadius, from.spin, target);
    allSolutions = allSolutions.concat(solutions);
    if (solutions.length === 0) {
      return { reachable: false, solutions: [], viableSolutions: [], reason: 'no-tangent' };
    }

    const viable = solutions.filter((solution) => {
      if (solution.missDistance > requiredMiss) {
        lastReason = 'precision';
        return false;
      }
      if (solution.travelDistance > maxTravel) {
        lastReason = 'flight-too-long';
        return false;
      }
      const impact: Vector2 = {
        x: solution.releasePoint.x + solution.direction.x * solution.travelDistance,
        y: solution.releasePoint.y + solution.direction.y * solution.travelDistance,
      };
      if (!isInsideHorizontalBounds(solution.releasePoint) || !isInsideHorizontalBounds(impact)) {
        lastReason = 'out-of-bounds';
        return false;
      }
      if (!isPathClear(solution.releasePoint, impact, opts.hazards, opts.hazardClearance)) {
        lastReason = 'blocked';
        return false;
      }
      return true;
    });

    perTargetViable.push(viable);
  }

  // A moving target must be catchable from *every* position it can occupy,
  // otherwise the player can be handed an unwinnable timing window.
  const reachable = perTargetViable.every((viable) => viable.length > 0);
  const viableSolutions = perTargetViable.flat();

  return reachable
    ? { reachable: true, solutions: allSolutions, viableSolutions }
    : {
        reachable: false,
        solutions: allSolutions,
        viableSolutions,
        reason: lastReason ?? 'precision',
      };
}

/**
 * True when a hazard would leave at least one viable launch solution intact.
 * Used to reject hazard placements that seal off a segment.
 */
export function hazardKeepsSegmentSolvable(
  from: CoreSpec,
  to: CoreSpec,
  hazards: readonly HazardSpec[],
  options: Partial<ReachabilityOptions> = {},
): boolean {
  return evaluateReachability(from, to, { ...options, hazards }).reachable;
}

/** Distance from a point to the closest hazard surface (for fragment placement). */
export function distanceToClosestHazard(point: Vector2, hazards: readonly HazardSpec[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const hazard of hazards) {
    const [a, b] = hazardSegment(hazard);
    best = Math.min(best, distancePointToSegment(point, a, b) - hazard.thickness / 2);
  }
  return best;
}
