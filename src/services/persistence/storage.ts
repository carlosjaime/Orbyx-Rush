/**
 * Storage abstraction.
 *
 * The game never talks to `localStorage` directly: every call goes through a
 * `StorageDriver` so that SSR, private-browsing lockdowns and future native
 * backends (Capacitor Preferences, IndexedDB) are drop-in replacements.
 */
export interface StorageDriver {
  readonly name: string;
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

/** In-memory driver: the SSR-safe and quota-exceeded fallback. */
export class MemoryStorageDriver implements StorageDriver {
  readonly name = 'memory';
  private readonly map = new Map<string, string>();

  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  set(key: string, value: string): boolean {
    this.map.set(key, value);
    return true;
  }

  remove(key: string): void {
    this.map.delete(key);
  }
}

export class LocalStorageDriver implements StorageDriver {
  readonly name = 'localStorage';

  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      // Quota exceeded or storage disabled — the caller falls back to memory.
      return false;
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* nothing we can do, and nothing worth crashing over */
    }
  }
}

function localStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const probe = '__orbyx_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

let cachedDriver: StorageDriver | null = null;

/** Returns the best driver available in the current environment. */
export function getStorageDriver(): StorageDriver {
  if (cachedDriver) return cachedDriver;
  cachedDriver = localStorageAvailable() ? new LocalStorageDriver() : new MemoryStorageDriver();
  return cachedDriver;
}

/** Test hook: forces a specific driver. */
export function setStorageDriver(driver: StorageDriver | null): void {
  cachedDriver = driver;
}
