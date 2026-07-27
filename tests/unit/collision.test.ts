import { describe, expect, it } from 'vitest';
import { HAZARDS, WORLD } from '@/game/config/balance';
import { CollisionSystem, checkBounds } from '@/game/systems/CollisionSystem';
import { CaptureSystem } from '@/game/systems/CaptureSystem';
import { LaunchSystem } from '@/game/systems/LaunchSystem';
import { OrbitSystem } from '@/game/systems/OrbitSystem';

const ORB_RADIUS = 20;

function hazard(overrides: Partial<Parameters<CollisionSystem['check']>[3][number]> = {}) {
  return {
    id: 1,
    a: { x: 400, y: 500 },
    b: { x: 700, y: 500 },
    thickness: HAZARDS.obstacle.thickness,
    lethal: true,
    ...overrides,
  };
}

describe('CollisionSystem', () => {
  it('detects a direct hit', () => {
    const system = new CollisionSystem();
    const results = system.check({ x: 550, y: 460 }, { x: 550, y: 540 }, ORB_RADIUS, [hazard()]);
    expect(results.some((result) => result.kind === 'hit')).toBe(true);
  });

  it('detects a hit even when the step tunnels past the hazard in one frame', () => {
    const system = new CollisionSystem();
    // A 900px step at 60fps would place both endpoints clear of the bar.
    const results = system.check({ x: 550, y: 100 }, { x: 550, y: 1000 }, ORB_RADIUS, [hazard()]);
    expect(results.some((result) => result.kind === 'hit')).toBe(true);
  });

  it('reports a near miss instead of a hit when passing close by', () => {
    const system = new CollisionSystem();
    const grazeY = 500 - (ORB_RADIUS + HAZARDS.obstacle.thickness / 2 + 20);
    const results = system.check({ x: 500, y: grazeY }, { x: 600, y: grazeY }, ORB_RADIUS, [
      hazard(),
    ]);
    expect(results.some((result) => result.kind === 'hit')).toBe(false);
    expect(results.some((result) => result.kind === 'near-miss')).toBe(true);
  });

  it('credits a near miss only once per flight', () => {
    const system = new CollisionSystem();
    const grazeY = 500 - (ORB_RADIUS + HAZARDS.obstacle.thickness / 2 + 20);
    const first = system.check({ x: 500, y: grazeY }, { x: 550, y: grazeY }, ORB_RADIUS, [
      hazard(),
    ]);
    const second = system.check({ x: 550, y: grazeY }, { x: 600, y: grazeY }, ORB_RADIUS, [
      hazard(),
    ]);
    expect(first.some((r) => r.kind === 'near-miss')).toBe(true);
    expect(second.some((r) => r.kind === 'near-miss')).toBe(false);

    system.resetFlight();
    const third = system.check({ x: 500, y: grazeY }, { x: 550, y: grazeY }, ORB_RADIUS, [
      hazard(),
    ]);
    expect(third.some((r) => r.kind === 'near-miss')).toBe(true);
  });

  it('ignores a non-lethal (warming up or off) laser', () => {
    const system = new CollisionSystem();
    const results = system.check({ x: 550, y: 460 }, { x: 550, y: 540 }, ORB_RADIUS, [
      hazard({ lethal: false }),
    ]);
    expect(results.some((result) => result.kind === 'hit')).toBe(false);
  });

  it('reports nothing when far away', () => {
    const system = new CollisionSystem();
    expect(system.check({ x: 100, y: 100 }, { x: 120, y: 120 }, ORB_RADIUS, [hazard()])).toEqual(
      [],
    );
  });
});

describe('checkBounds', () => {
  it('kills the orb once it falls past the trailing void line', () => {
    const cameraTop = 0;
    expect(checkBounds({ x: 540, y: WORLD.height + WORLD.voidKillMargin + 1 }, cameraTop)).toBe(
      'void',
    );
  });

  it('allows the orb to be below the camera but still on screen', () => {
    expect(checkBounds({ x: 540, y: WORLD.height - 100 }, 0)).toBeNull();
  });

  it('kills the orb once it leaves the field horizontally', () => {
    expect(checkBounds({ x: -WORLD.horizontalKillMargin - 1, y: 500 }, 0)).toBe('out-of-bounds');
    expect(checkBounds({ x: WORLD.width + WORLD.horizontalKillMargin + 1, y: 500 }, 0)).toBe(
      'out-of-bounds',
    );
  });

  it('tracks the camera so the kill line rises with it', () => {
    const cameraTop = -5000;
    expect(checkBounds({ x: 540, y: -5000 + WORLD.height }, cameraTop)).toBeNull();
    expect(
      checkBounds({ x: 540, y: -5000 + WORLD.height + WORLD.voidKillMargin + 10 }, cameraTop),
    ).toBe('void');
  });
});

describe('CaptureSystem', () => {
  const candidate = (id: number, x: number, y: number) => ({
    id,
    center: { x, y },
    orbitRadius: 120,
    captureRadius: 170,
    active: true,
  });

  it('captures when inside the capture radius', () => {
    const system = new CaptureSystem();
    const verdict = system.evaluate({ x: 540, y: 400 }, [candidate(1, 540, 520)], null);
    expect(verdict?.candidateId).toBe(1);
  });

  it('classifies an approach on the orbit ring as perfect', () => {
    const system = new CaptureSystem();
    const verdict = system.evaluate({ x: 540, y: 400 }, [candidate(1, 540, 520)], null);
    expect(verdict?.quality).toBe('perfect');
    expect(verdict?.precision).toBeGreaterThan(0.9);
  });

  it('classifies a dead-centre approach as good, not perfect', () => {
    const system = new CaptureSystem();
    const verdict = system.evaluate({ x: 540, y: 515 }, [candidate(1, 540, 520)], null);
    expect(verdict?.quality).toBe('good');
  });

  it('ignores the excluded core during the release grace window', () => {
    const system = new CaptureSystem();
    expect(system.evaluate({ x: 540, y: 400 }, [candidate(1, 540, 520)], 1)).toBeNull();
  });

  it('ignores collapsed cores', () => {
    const system = new CaptureSystem();
    const collapsed = { ...candidate(1, 540, 520), active: false };
    expect(system.evaluate({ x: 540, y: 400 }, [collapsed], null)).toBeNull();
  });

  it('prefers the core whose ring the orb entered most deeply', () => {
    const system = new CaptureSystem();
    const verdict = system.evaluate(
      { x: 540, y: 500 },
      [candidate(1, 540, 520), candidate(2, 540, 640)],
      null,
    );
    expect(verdict?.candidateId).toBe(1);
  });

  it('picks an assist target that lies ahead of the current heading', () => {
    const system = new CaptureSystem();
    const ahead = candidate(1, 540, 200);
    const behind = candidate(2, 540, 900);
    const target = system.pickAssistTarget(
      { x: 540, y: 500 },
      { x: 0, y: -700 },
      [ahead, behind],
      null,
    );
    expect(target?.id).toBe(1);
  });
});

describe('OrbitSystem and LaunchSystem', () => {
  it('advances the orbit angle at the configured angular speed', () => {
    const orbit = new OrbitSystem();
    orbit.attach({
      center: { x: 0, y: 0 },
      approachPoint: { x: 100, y: 0 },
      targetRadius: 100,
      spin: 1,
      angularSpeed: Math.PI,
    });

    // Half a second at pi rad/s is a quarter turn.
    orbit.advance(0.5);
    const state = orbit.current;
    expect(state?.angle).toBeCloseTo(Math.PI / 2, 4);
  });

  it('produces the same position for one big step and many small steps', () => {
    const build = () => {
      const orbit = new OrbitSystem();
      orbit.attach({
        center: { x: 0, y: 0 },
        approachPoint: { x: 100, y: 0 },
        targetRadius: 100,
        spin: 1,
        angularSpeed: 2,
      });
      return orbit;
    };

    const coarse = build();
    coarse.advance(1);

    const fine = build();
    for (let i = 0; i < 100; i += 1) fine.advance(0.01);

    expect(fine.current?.angle).toBeCloseTo(coarse.current?.angle ?? -1, 6);
  });

  it('flags an orbit that has run past its safety limit', () => {
    const orbit = new OrbitSystem();
    orbit.attach({
      center: { x: 0, y: 0 },
      approachPoint: { x: 100, y: 0 },
      targetRadius: 100,
      spin: -1,
      angularSpeed: 2,
    });
    expect(orbit.exceededMaxOrbitTime).toBe(false);
    orbit.advance(99);
    expect(orbit.exceededMaxOrbitTime).toBe(true);
  });

  it('travels in a straight line at constant speed with no assist target', () => {
    const launcher = new LaunchSystem();
    launcher.launch({ x: 0, y: 0 }, { x: 0, y: -1 }, 800);
    for (let i = 0; i < 10; i += 1) launcher.advance(0.05, null);
    const state = launcher.current;
    expect(state?.position.x).toBeCloseTo(0, 6);
    expect(state?.position.y).toBeCloseTo(-400, 6);
  });

  it('normalises the launch direction so speed is exact', () => {
    const launcher = new LaunchSystem();
    const state = launcher.launch({ x: 0, y: 0 }, { x: 3, y: 4 }, 500);
    expect(Math.hypot(state.velocity.x, state.velocity.y)).toBeCloseTo(500, 6);
  });

  it('keeps assist from changing the travel speed', () => {
    const launcher = new LaunchSystem();
    launcher.launch({ x: 0, y: 0 }, { x: 0, y: -1 }, 800);
    const target = { center: { x: 120, y: -300 }, captureRadius: 170 };
    for (let i = 0; i < 20; i += 1) launcher.advance(0.016, target);
    const state = launcher.current!;
    expect(Math.hypot(state.velocity.x, state.velocity.y)).toBeCloseTo(800, 3);
  });

  it('gives up on a flight that has taken too long', () => {
    const launcher = new LaunchSystem();
    launcher.launch({ x: 0, y: 0 }, { x: 1, y: 0 }, 700);
    expect(launcher.exceededMaxFlightTime).toBe(false);
    for (let i = 0; i < 400; i += 1) launcher.advance(0.016, null);
    expect(launcher.exceededMaxFlightTime).toBe(true);
  });
});
