import { POWERUPS } from '@/game/config/balance';
import type { ZoneKind } from '@/game/types';

/**
 * Timed effects: the shield, and the slow / boost / gravity fields.
 *
 * Effects are stored as countdown timers advanced with real delta time so a
 * slow-motion field cannot extend its own duration.
 */

export interface ActiveZoneEffect {
  kind: Exclude<ZoneKind, 'portal'>;
  remaining: number;
  /** Sign of the lateral push applied by a gravity field. */
  direction: number;
}

export class PowerUpSystem {
  private shieldCharges = 0;
  private shieldRemaining = 0;
  private invulnerableRemaining = 0;
  private zone: ActiveZoneEffect | null = null;

  reset(): void {
    this.shieldCharges = 0;
    this.shieldRemaining = 0;
    this.invulnerableRemaining = 0;
    this.zone = null;
  }

  grantShield(): void {
    this.shieldCharges = POWERUPS.shield.charges;
    this.shieldRemaining = POWERUPS.shield.duration;
  }

  grantInvulnerability(seconds: number = POWERUPS.revive.invulnerability): void {
    this.invulnerableRemaining = seconds;
  }

  enterZone(kind: ZoneKind, direction: number): void {
    if (kind === 'portal') return;
    const duration =
      kind === 'slow'
        ? POWERUPS.slowZone.duration
        : kind === 'boost'
          ? POWERUPS.boostZone.duration
          : POWERUPS.gravityZone.duration;
    this.zone = { kind, remaining: duration, direction };
  }

  /**
   * Consumes a lethal hit if possible.
   * Returns `'shielded'`, `'invulnerable'` or `'fatal'`.
   */
  absorbHit(): 'shielded' | 'invulnerable' | 'fatal' {
    if (this.invulnerableRemaining > 0) return 'invulnerable';
    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1;
      this.shieldRemaining = 0;
      return 'shielded';
    }
    return 'fatal';
  }

  update(realDeltaSeconds: number): void {
    if (this.shieldRemaining > 0) {
      this.shieldRemaining = Math.max(0, this.shieldRemaining - realDeltaSeconds);
      if (this.shieldRemaining === 0) this.shieldCharges = 0;
    }
    if (this.invulnerableRemaining > 0) {
      this.invulnerableRemaining = Math.max(0, this.invulnerableRemaining - realDeltaSeconds);
    }
    if (this.zone) {
      this.zone.remaining -= realDeltaSeconds;
      if (this.zone.remaining <= 0) this.zone = null;
    }
  }

  get shieldActive(): boolean {
    return this.shieldCharges > 0;
  }

  get shieldSecondsLeft(): number {
    return this.shieldRemaining;
  }

  get isInvulnerable(): boolean {
    return this.invulnerableRemaining > 0;
  }

  get activeZone(): ActiveZoneEffect | null {
    return this.zone;
  }

  /** Gameplay time scale contributed by an active slow field. */
  get timeScale(): number {
    return this.zone?.kind === 'slow' ? POWERUPS.slowZone.timeScale : 1;
  }

  /** Speed multiplier contributed by an active boost field. */
  get speedMultiplier(): number {
    return this.zone?.kind === 'boost' ? POWERUPS.boostZone.speedMul : 1;
  }

  /** Lateral acceleration contributed by an active gravity field. */
  get lateralAcceleration(): number {
    if (this.zone?.kind !== 'gravity') return 0;
    return POWERUPS.gravityZone.lateralAcceleration * this.zone.direction;
  }
}
