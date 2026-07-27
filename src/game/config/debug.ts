/**
 * Development-only debug flags.
 *
 * `isDebugAvailable` is the single gate: it is false in any production build
 * unless `NEXT_PUBLIC_ENABLE_DEBUG` is explicitly set, so the panel can never
 * ship to a store build by accident.
 */

export interface DebugFlags {
  showFps: boolean;
  showHitboxes: boolean;
  showGravityRadius: boolean;
  showTrajectory: boolean;
  invincible: boolean;
  timeScale: number;
  simulateSlowDevice: boolean;
  forcedSeed: string | null;
}

export const DEFAULT_DEBUG_FLAGS: DebugFlags = {
  showFps: false,
  showHitboxes: false,
  showGravityRadius: false,
  showTrajectory: false,
  invincible: false,
  timeScale: 1,
  simulateSlowDevice: false,
  forcedSeed: null,
};

export function isDebugAvailable(): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  return process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true';
}

/**
 * Mutable singleton read by the Phaser scenes each frame. Deliberately not a
 * store: it must be readable from the game loop without a React subscription.
 */
class DebugStateHolder {
  private flags: DebugFlags = { ...DEFAULT_DEBUG_FLAGS };
  private listeners = new Set<(flags: DebugFlags) => void>();

  get current(): DebugFlags {
    return isDebugAvailable() ? this.flags : DEFAULT_DEBUG_FLAGS;
  }

  set<K extends keyof DebugFlags>(key: K, value: DebugFlags[K]): void {
    if (!isDebugAvailable()) return;
    this.flags = { ...this.flags, [key]: value };
    for (const listener of this.listeners) listener(this.flags);
  }

  toggle(key: KeysOfType<DebugFlags, boolean>): void {
    this.set(key, !this.flags[key]);
  }

  reset(): void {
    this.flags = { ...DEFAULT_DEBUG_FLAGS };
    for (const listener of this.listeners) listener(this.flags);
  }

  subscribe(listener: (flags: DebugFlags) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

type KeysOfType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];

export const debugState = new DebugStateHolder();
