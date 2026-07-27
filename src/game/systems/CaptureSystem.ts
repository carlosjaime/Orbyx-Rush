import { ORBIT } from '@/game/config/balance';
import { classifyCapture } from '@/game/physics/orbitMath';
import type { CaptureQuality, Vector2 } from '@/game/types';

/**
 * Decides whether a flying orb has been caught by a gravitational core.
 *
 * Deliberately geometric and stateless: given positions it returns a verdict,
 * which makes the "was that capture fair?" question answerable in a test.
 */

export interface CaptureCandidate {
  id: number;
  center: Vector2;
  orbitRadius: number;
  captureRadius: number;
  /** Collapsed decoys can no longer catch anything. */
  active: boolean;
}

export interface CaptureVerdict {
  candidateId: number;
  quality: CaptureQuality;
  /** Distance from the core centre at the moment of capture. */
  approachDistance: number;
  /** How far inside the perfect band the approach landed, 0..1. */
  precision: number;
}

export class CaptureSystem {
  /**
   * Returns the best capture for this frame, or null.
   *
   * When several cores overlap, the one whose ring the orb entered *deepest*
   * wins, which matches what the player perceives as "the one I flew into".
   */
  evaluate(
    orbPosition: Vector2,
    candidates: readonly CaptureCandidate[],
    excludeId: number | null,
  ): CaptureVerdict | null {
    let best: CaptureVerdict | null = null;
    let bestDepth = -Infinity;

    for (const candidate of candidates) {
      if (!candidate.active) continue;
      if (candidate.id === excludeId) continue;

      const distance = Math.hypot(
        orbPosition.x - candidate.center.x,
        orbPosition.y - candidate.center.y,
      );
      if (distance > candidate.captureRadius) continue;

      const depth = candidate.captureRadius - distance;
      if (depth <= bestDepth) continue;

      const quality = classifyCapture(distance, candidate.orbitRadius, ORBIT.perfectBand);
      const offset = Math.abs(distance - candidate.orbitRadius);
      bestDepth = depth;
      best = {
        candidateId: candidate.id,
        quality,
        approachDistance: distance,
        precision: Math.max(0, 1 - offset / ORBIT.perfectBand),
      };
    }

    return best;
  }

  /**
   * The core the steering assist should aim at: the nearest active candidate
   * ahead of the orb's current heading.
   */
  pickAssistTarget(
    orbPosition: Vector2,
    velocity: Vector2,
    candidates: readonly CaptureCandidate[],
    excludeId: number | null,
  ): CaptureCandidate | null {
    let best: CaptureCandidate | null = null;
    let bestScore = Infinity;
    const speed = Math.hypot(velocity.x, velocity.y) || 1;
    const dirX = velocity.x / speed;
    const dirY = velocity.y / speed;

    for (const candidate of candidates) {
      if (!candidate.active || candidate.id === excludeId) continue;
      const dx = candidate.center.x - orbPosition.x;
      const dy = candidate.center.y - orbPosition.y;
      const forward = dx * dirX + dy * dirY;
      if (forward <= 0) continue;
      const lateral = Math.abs(dx * -dirY + dy * dirX);
      // Prefer targets that are close *and* nearly on the current heading.
      const score = forward + lateral * 2.5;
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    return best;
  }
}
