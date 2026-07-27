import type { Vector2 } from '@/game/types';

/**
 * Pure orbital / ballistic maths.
 *
 * Nothing in here touches Phaser, the DOM or global time, which is what lets
 * the level generator prove a track is solvable *before* it is ever rendered.
 */

export const TWO_PI = Math.PI * 2;

/** Position on a circle. */
export function pointOnCircle(center: Vector2, radius: number, angle: number): Vector2 {
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

/**
 * Unit tangent at `angle` for the given spin direction.
 *
 * With spin = +1 the orb travels counter-clockwise in screen space, so the
 * tangent is the radius vector rotated by +90°.
 */
export function tangentAt(angle: number, spin: 1 | -1): Vector2 {
  return { x: -Math.sin(angle) * spin, y: Math.cos(angle) * spin };
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function distanceSquared(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/** Normalises an angle into `[0, 2π)`. */
export function normalizeAngle(angle: number): number {
  const wrapped = angle % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
}

/** Shortest signed delta from `from` to `to`, in `(-π, π]`. */
export function angleDelta(from: number, to: number): number {
  let delta = normalizeAngle(to) - normalizeAngle(from);
  if (delta > Math.PI) delta -= TWO_PI;
  if (delta <= -Math.PI) delta += TWO_PI;
  return delta;
}

/** Shortest distance from `point` to the infinite line through `a` with dir `d`. */
export function distancePointToRay(point: Vector2, origin: Vector2, direction: Vector2): number {
  const len = Math.hypot(direction.x, direction.y);
  if (len === 0) return distance(point, origin);
  const dx = direction.x / len;
  const dy = direction.y / len;
  const px = point.x - origin.x;
  const py = point.y - origin.y;
  const t = px * dx + py * dy;
  // Behind the ray origin the closest point is the origin itself.
  if (t <= 0) return Math.hypot(px, py);
  return Math.abs(px * dy - py * dx);
}

/** Parametric distance along a ray at which `point` is closest to it. */
export function projectionOnRay(point: Vector2, origin: Vector2, direction: Vector2): number {
  const len = Math.hypot(direction.x, direction.y);
  if (len === 0) return 0;
  return ((point.x - origin.x) * direction.x + (point.y - origin.y) * direction.y) / len;
}

/** Shortest distance between a point and a finite segment. */
export function distancePointToSegment(point: Vector2, a: Vector2, b: Vector2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq === 0) return distance(point, a);
  let t = ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(point.x - (a.x + abx * t), point.y - (a.y + aby * t));
}

/** Shortest distance between two finite segments (0 when they intersect). */
export function distanceSegmentToSegment(
  a1: Vector2,
  a2: Vector2,
  b1: Vector2,
  b2: Vector2,
): number {
  if (segmentsIntersect(a1, a2, b1, b2)) return 0;
  return Math.min(
    distancePointToSegment(a1, b1, b2),
    distancePointToSegment(a2, b1, b2),
    distancePointToSegment(b1, a1, a2),
    distancePointToSegment(b2, a1, a2),
  );
}

function orientation(p: Vector2, q: Vector2, r: Vector2): number {
  const value = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(value) < 1e-9) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(p: Vector2, q: Vector2, r: Vector2): boolean {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}

export function segmentsIntersect(p1: Vector2, q1: Vector2, p2: Vector2, q2: Vector2): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

export interface LaunchSolution {
  /** Angle on the source orbit at which the player must release. */
  releaseAngle: number;
  /** World position of the release point. */
  releasePoint: Vector2;
  /** Unit direction of travel after release. */
  direction: Vector2;
  /** Distance travelled until the closest approach to the target. */
  travelDistance: number;
  /** Closest approach distance to the target centre. */
  missDistance: number;
}

/**
 * Finds the release angles on a circular orbit whose tangent ray passes as
 * close as possible to `target`.
 *
 * Geometry: a release from angle θ produces a ray tangent to the orbit circle.
 * The perpendicular distance from the target to that ray is
 * `|D·cos(φ) − r|` where φ is the angle between the radius vector and the
 * target direction. Setting it to zero gives `cos(φ) = r / D`, which has two
 * solutions (one on each side) whenever `D ≥ r`. Both are returned; the caller
 * decides which is usable given the spin direction and the obstacle layout.
 */
export function findLaunchSolutions(
  center: Vector2,
  orbitRadius: number,
  spin: 1 | -1,
  target: Vector2,
): LaunchSolution[] {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const targetDistance = Math.hypot(dx, dy);
  if (targetDistance <= 1e-6) return [];

  const baseAngle = Math.atan2(dy, dx);
  // When the target is inside the orbit circle no tangent ray can reach it
  // head-on; fall back to the two extreme angles so callers still get data.
  const ratio = Math.min(1, orbitRadius / targetDistance);
  const phi = Math.acos(ratio);

  const candidates = [baseAngle + phi, baseAngle - phi];
  const solutions: LaunchSolution[] = [];

  for (const releaseAngle of candidates) {
    const releasePoint = pointOnCircle(center, orbitRadius, releaseAngle);
    const direction = tangentAt(releaseAngle, spin);
    const travelDistance = projectionOnRay(target, releasePoint, direction);
    // A solution that would require travelling backwards is not reachable with
    // this spin direction — the orb only ever moves along its tangent.
    if (travelDistance <= 0) continue;
    solutions.push({
      releaseAngle: normalizeAngle(releaseAngle),
      releasePoint,
      direction,
      travelDistance,
      missDistance: distancePointToRay(target, releasePoint, direction),
    });
  }

  return solutions.sort((a, b) => a.missDistance - b.missDistance);
}

/** Samples the straight flight path into a polyline, for collision proofs. */
export function sampleFlightPath(
  origin: Vector2,
  direction: Vector2,
  travelDistance: number,
  samples = 12,
): Vector2[] {
  const points: Vector2[] = [];
  const len = Math.hypot(direction.x, direction.y) || 1;
  const dx = direction.x / len;
  const dy = direction.y / len;
  for (let i = 0; i <= samples; i += 1) {
    const t = (travelDistance * i) / samples;
    points.push({ x: origin.x + dx * t, y: origin.y + dy * t });
  }
  return points;
}

/**
 * Predicts the capture quality of an approach.
 *
 * `approachDistance` is the orb's distance to the core centre at the moment it
 * crosses the capture radius.
 */
export function classifyCapture(
  approachDistance: number,
  orbitRadius: number,
  perfectBand: number,
): 'perfect' | 'good' {
  return Math.abs(approachDistance - orbitRadius) <= perfectBand ? 'perfect' : 'good';
}
