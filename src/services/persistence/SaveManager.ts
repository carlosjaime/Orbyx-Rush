import { migrateSave } from '@/services/persistence/migrations';
import {
  STORAGE_KEYS,
  SAVE_SCHEMA_VERSION,
  createDefaultSave,
  sanitizeSave,
  type SaveData,
} from '@/services/persistence/schema';
import { getStorageDriver, type StorageDriver } from '@/services/persistence/storage';

export interface LoadReport {
  data: SaveData;
  migrated: boolean;
  recovered: boolean;
  appliedSteps: string[];
}

/**
 * Owns the on-device save file.
 *
 * Guarantees:
 *  - Loading never throws. Corrupt data degrades to a backup, then to defaults.
 *  - Writes are debounced and always leave the previous good copy as a backup.
 *  - Progress can be exported / imported as plain JSON by the player.
 */
export class SaveManager {
  private driver: StorageDriver;
  private cache: SaveData | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;

  constructor(driver: StorageDriver = getStorageDriver(), debounceMs = 220) {
    this.driver = driver;
    this.debounceMs = debounceMs;
  }

  /** Reads, migrates and validates the save. Cached after the first call. */
  load(): LoadReport {
    if (this.cache) {
      return { data: this.cache, migrated: false, recovered: false, appliedSteps: [] };
    }

    const primary = this.readKey(STORAGE_KEYS.save);
    if (primary.ok) {
      const result = migrateSave(primary.value);
      this.cache = result.data;
      if (result.migrated) this.writeNow(result.data);
      return {
        data: result.data,
        migrated: result.migrated,
        recovered: result.recovered,
        appliedSteps: result.appliedSteps,
      };
    }

    // Primary unreadable: try the backup written before the last risky change.
    const backup = this.readKey(STORAGE_KEYS.backup);
    if (backup.ok) {
      const result = migrateSave(backup.value);
      this.cache = result.data;
      this.writeNow(result.data);
      return {
        data: result.data,
        migrated: result.migrated,
        recovered: true,
        appliedSteps: [...result.appliedSteps, 'restored from backup'],
      };
    }

    const fresh = createDefaultSave();
    this.cache = fresh;
    return {
      data: fresh,
      migrated: false,
      recovered: primary.corrupt || backup.corrupt,
      appliedSteps: [],
    };
  }

  /** Current in-memory save, loading it on first access. */
  get current(): SaveData {
    return this.cache ?? this.load().data;
  }

  /** Applies a partial update and schedules a debounced write. */
  update(mutator: (draft: SaveData) => void): SaveData {
    const draft: SaveData = structuredCloneSafe(this.current);
    mutator(draft);
    draft.version = SAVE_SCHEMA_VERSION;
    draft.updatedAt = Date.now();
    this.cache = sanitizeSave(draft);
    this.scheduleFlush();
    return this.cache;
  }

  /** Forces an immediate write (used on pagehide / app background). */
  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.cache) this.writeNow(this.cache);
  }

  /** Wipes all progress and returns a fresh default save. */
  reset(): SaveData {
    const fresh = createDefaultSave();
    this.cache = fresh;
    this.driver.remove(STORAGE_KEYS.backup);
    this.writeNow(fresh);
    return fresh;
  }

  /** Serialises the save for the "export progress" feature. */
  export(): string {
    return JSON.stringify(this.current, null, 2);
  }

  /**
   * Imports a previously exported payload. Returns false when the JSON is not
   * parseable; anything parseable is sanitised rather than rejected.
   */
  import(json: string): boolean {
    try {
      const parsed: unknown = JSON.parse(json);
      const result = migrateSave(parsed);
      this.cache = result.data;
      this.flush();
      return true;
    } catch {
      return false;
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      if (this.cache) this.writeNow(this.cache);
    }, this.debounceMs);
  }

  private writeNow(data: SaveData): void {
    const serialised = JSON.stringify(data);
    const previous = this.driver.get(STORAGE_KEYS.save);
    if (previous && previous !== serialised) {
      this.driver.set(STORAGE_KEYS.backup, previous);
    }
    this.driver.set(STORAGE_KEYS.save, serialised);
  }

  private readKey(key: string): { ok: boolean; value: unknown; corrupt: boolean } {
    const raw = this.driver.get(key);
    if (raw === null) return { ok: false, value: null, corrupt: false };
    try {
      return { ok: true, value: JSON.parse(raw) as unknown, corrupt: false };
    } catch {
      console.warn(`[SaveManager] corrupt payload in "${key}", ignoring it`);
      return { ok: false, value: null, corrupt: true };
    }
  }
}

/** `structuredClone` with a JSON fallback for older runtimes. */
function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

let singleton: SaveManager | null = null;

export function getSaveManager(): SaveManager {
  if (!singleton) singleton = new SaveManager();
  return singleton;
}

/** Test hook. */
export function setSaveManager(manager: SaveManager | null): void {
  singleton = manager;
}
