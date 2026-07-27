import { afterEach, beforeEach, vi } from 'vitest';
import { setSaveManager } from '@/services/persistence/SaveManager';
import { setStorageDriver } from '@/services/persistence/storage';

/**
 * Shared unit-test setup.
 *
 * Every test starts with a clean, in-memory storage layer so no test can leak
 * a save file into the next one.
 */
beforeEach(() => {
  window.localStorage.clear();
  setStorageDriver(null);
  setSaveManager(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  setStorageDriver(null);
  setSaveManager(null);
});
