import { describe, expect, it } from 'vitest';
import { ORBIT } from '@/game/config/balance';
import {
  angleDelta,
  classifyCapture,
  distancePointToSegment,
  distanceSegmentToSegment,
  findLaunchSolutions,
  normalizeAngle,
  pointOnCircle,
  segmentsIntersect,
  tangentAt,
} from '@/game/physics/orbitMath';

describe('normalizeAngle / angleDelta', () => {
  it('wraps into [0, 2pi)', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 6);
    expect(normalizeAngle(Math.PI * 5)).toBeCloseTo(Math.PI, 6);
  });

  it('returns the shortest signed delta', () => {
    expect(angleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 6);
    expect(angleDelta(0, -Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 6);
    // Crossing the wrap point must take the short way around.
    expect(Math.abs(angleDelta(0.1, Math.PI * 2 - 0.1))).toBeCloseTo(0.2, 6);
  });
});

describe('tangentAt', () => {
  it('is perpendicular to the radius vector', () => {
    for (const angle of [0, 0.7, Math.PI, 4.2]) {
      const radial = { x: Math.cos(angle), y: Math.sin(angle) };
      for (const spin of [1, -1] as const) {
        const tangent = tangentAt(angle, spin);
        expect(radial.x * tangent.x + radial.y * tangent.y).toBeCloseTo(0, 10);
        expect(Math.hypot(tangent.x, tangent.y)).toBeCloseTo(1, 10);
      }
    }
  });

  it('flips direction with the spin', () => {
    const a = tangentAt(1.2, 1);
    const b = tangentAt(1.2, -1);
    expect(a.x).toBeCloseTo(-b.x, 10);
    expect(a.y).toBeCloseTo(-b.y, 10);
  });
});

describe('findLaunchSolutions', () => {
  const center = { x: 0, y: 0 };
  const radius = 120;

  it('finds a tangent ray that passes exactly through a distant target', () => {
    const target = { x: 0, y: -800 };
    const solutions = findLaunchSolutions(center, radius, 1, target);
    expect(solutions.length).toBeGreaterThan(0);
    expect(solutions[0]!.missDistance).toBeLessThan(1e-6);
  });

  it('places the release point exactly on the orbit circle', () => {
    const solutions = findLaunchSolutions(center, radius, -1, { x: 500, y: -600 });
    for (const solution of solutions) {
      expect(Math.hypot(solution.releasePoint.x, solution.releasePoint.y)).toBeCloseTo(radius, 6);
    }
  });

  it('only returns forward-travelling solutions', () => {
    const solutions = findLaunchSolutions(center, radius, 1, { x: 300, y: -700 });
    for (const solution of solutions) {
      expect(solution.travelDistance).toBeGreaterThan(0);
    }
  });

  it('returns solutions sorted by miss distance', () => {
    const solutions = findLaunchSolutions(center, radius, 1, { x: -400, y: -520 });
    for (let i = 1; i < solutions.length; i += 1) {
      expect(solutions[i]!.missDistance).toBeGreaterThanOrEqual(solutions[i - 1]!.missDistance);
    }
  });

  it('always finds at least one solution when the target is outside the orbit', () => {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.31) {
      for (const spin of [1, -1] as const) {
        const target = pointOnCircle(center, radius * 4, angle);
        const solutions = findLaunchSolutions(center, radius, spin, target);
        expect(solutions.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns nothing for a degenerate target on the centre', () => {
    expect(findLaunchSolutions(center, radius, 1, { x: 0, y: 0 })).toEqual([]);
  });
});

describe('geometry helpers', () => {
  it('measures point-to-segment distance including the endpoints', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(distancePointToSegment({ x: 5, y: 4 }, a, b)).toBeCloseTo(4, 6);
    expect(distancePointToSegment({ x: -3, y: 0 }, a, b)).toBeCloseTo(3, 6);
    expect(distancePointToSegment({ x: 14, y: 0 }, a, b)).toBeCloseTo(4, 6);
  });

  it('detects intersecting segments', () => {
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }),
    ).toBe(true);
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 6, y: 0 }, { x: 10, y: 0 })).toBe(
      false,
    );
  });

  it('reports zero distance for crossing segments', () => {
    expect(
      distanceSegmentToSegment({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }),
    ).toBe(0);
  });

  it('measures the gap between parallel segments', () => {
    expect(
      distanceSegmentToSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 }),
    ).toBeCloseTo(5, 6);
  });
});

describe('classifyCapture', () => {
  it('is perfect exactly inside the band and good outside it', () => {
    const radius = 120;
    expect(classifyCapture(radius, radius, ORBIT.perfectBand)).toBe('perfect');
    expect(classifyCapture(radius + ORBIT.perfectBand, radius, ORBIT.perfectBand)).toBe('perfect');
    expect(classifyCapture(radius + ORBIT.perfectBand + 0.1, radius, ORBIT.perfectBand)).toBe(
      'good',
    );
    expect(classifyCapture(radius - ORBIT.perfectBand - 0.1, radius, ORBIT.perfectBand)).toBe(
      'good',
    );
  });
});
