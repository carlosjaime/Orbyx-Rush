import { describe, expect, it } from 'vitest';
import { SaveManager } from '@/services/persistence/SaveManager';
import { MIGRATIONS, migrateSave } from '@/services/persistence/migrations';
import {
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  SAVE_SCHEMA_VERSION,
  STORAGE_KEYS,
  createDefaultSave,
  sanitizeSave,
} from '@/services/persistence/schema';
import { MemoryStorageDriver } from '@/services/persistence/storage';

function freshManager() {
  return new SaveManager(new MemoryStorageDriver(), 0);
}

describe('sanitizeSave', () => {
  it('returns full defaults for garbage input', () => {
    for (const input of [null, undefined, 42, 'text', [], true]) {
      const result = sanitizeSave(input);
      expect(result.version).toBe(SAVE_SCHEMA_VERSION);
      expect(result.settings).toEqual(DEFAULT_SETTINGS);
      expect(result.profile.bestScore).toBe(0);
    }
  });

  it('repairs individual corrupt fields without discarding the good ones', () => {
    const result = sanitizeSave({
      version: SAVE_SCHEMA_VERSION,
      settings: { musicVolume: 'loud', sfxVolume: 0.4, particleQuality: 'ultra', muted: 1 },
      profile: { bestScore: 12345, totalRuns: 'many', level: -8 },
    });

    expect(result.settings.musicVolume).toBe(DEFAULT_SETTINGS.musicVolume);
    expect(result.settings.sfxVolume).toBe(0.4);
    expect(result.settings.particleQuality).toBe(DEFAULT_SETTINGS.particleQuality);
    expect(result.settings.muted).toBe(DEFAULT_SETTINGS.muted);
    expect(result.profile.bestScore).toBe(12345);
    expect(result.profile.totalRuns).toBe(0);
    expect(result.profile.level).toBeGreaterThanOrEqual(1);
  });

  it('clamps volumes into [0, 1]', () => {
    const result = sanitizeSave({
      settings: { musicVolume: 12, sfxVolume: -4 },
    });
    expect(result.settings.musicVolume).toBe(1);
    expect(result.settings.sfxVolume).toBe(0);
  });

  it('never drops the default cosmetics from the unlocked list', () => {
    const result = sanitizeSave({ profile: { unlockedSkins: ['violet-drift'] } });
    expect(result.profile.unlockedSkins).toContain('cyan-pulse');
    expect(result.profile.unlockedSkins).toContain('violet-drift');
  });

  it('falls back to a default when an unowned cosmetic is equipped', () => {
    const result = sanitizeSave({
      profile: { unlockedSkins: ['cyan-pulse'], equippedSkin: 'null-core' },
    });
    expect(result.profile.equippedSkin).toBe(DEFAULT_PROFILE.equippedSkin);
  });

  it('discards malformed daily records', () => {
    const result = sanitizeSave({
      daily: [
        { date: '2026-01-01', bestScore: 500, attempts: 2, completed: true },
        { date: 'not-a-date', bestScore: 9 },
        'garbage',
      ],
    });
    expect(result.daily).toHaveLength(1);
    expect(result.daily[0]?.date).toBe('2026-01-01');
  });
});

describe('migrations', () => {
  it('declares a continuous chain up to the current version', () => {
    let version = 1;
    for (const migration of MIGRATIONS) {
      expect(migration.from).toBe(version);
      expect(migration.to).toBe(version + 1);
      version = migration.to;
    }
    expect(version).toBe(SAVE_SCHEMA_VERSION);
  });

  it('upgrades a v1 payload and preserves the old high score', () => {
    const result = migrateSave({ version: 1, highScore: 9876, volume: 0.3 });
    expect(result.migrated).toBe(true);
    expect(result.data.version).toBe(SAVE_SCHEMA_VERSION);
    expect(result.data.profile.bestScore).toBe(9876);
    expect(result.data.settings.musicVolume).toBe(0.3);
  });

  it('upgrades a v2 payload and seeds the new XP fields', () => {
    const result = migrateSave({
      version: 2,
      profile: { bestScore: 100, unlockedSkins: ['cyan-pulse'] },
      settings: {},
    });
    expect(result.data.version).toBe(SAVE_SCHEMA_VERSION);
    expect(result.data.profile.xp).toBe(0);
    expect(result.data.profile.level).toBe(1);
    expect(result.data.daily).toEqual([]);
  });

  it('leaves a current-version payload untouched', () => {
    const save = createDefaultSave();
    save.profile.bestScore = 4242;
    const result = migrateSave(save);
    expect(result.migrated).toBe(false);
    expect(result.data.profile.bestScore).toBe(4242);
  });

  it('recovers rather than throwing on a save from a newer build', () => {
    const result = migrateSave({ version: 999, profile: { bestScore: 55 } });
    expect(result.recovered).toBe(true);
    expect(result.data.profile.bestScore).toBe(55);
  });
});

describe('SaveManager', () => {
  it('starts from defaults when storage is empty', () => {
    const report = freshManager().load();
    expect(report.recovered).toBe(false);
    expect(report.data.profile.bestScore).toBe(0);
  });

  it('round-trips an update through storage', () => {
    const driver = new MemoryStorageDriver();
    const manager = new SaveManager(driver, 0);
    manager.update((draft) => {
      draft.profile.bestScore = 31337;
    });
    manager.flush();

    const reloaded = new SaveManager(driver, 0).load();
    expect(reloaded.data.profile.bestScore).toBe(31337);
  });

  it('recovers from a corrupt primary payload using the backup', () => {
    const driver = new MemoryStorageDriver();
    const manager = new SaveManager(driver, 0);
    manager.update((draft) => {
      draft.profile.bestScore = 777;
    });
    manager.flush();
    // Force a second write so a backup exists, then corrupt the primary.
    manager.update((draft) => {
      draft.profile.bestScore = 888;
    });
    manager.flush();
    driver.set(STORAGE_KEYS.save, '{ this is not json');

    const report = new SaveManager(driver, 0).load();
    expect(report.recovered).toBe(true);
    expect(report.data.profile.bestScore).toBe(777);
  });

  it('falls back to defaults when everything is corrupt, and still loads', () => {
    const driver = new MemoryStorageDriver();
    driver.set(STORAGE_KEYS.save, '<<<broken>>>');
    driver.set(STORAGE_KEYS.backup, 'also broken');

    const report = new SaveManager(driver, 0).load();
    expect(report.recovered).toBe(true);
    expect(report.data.profile.bestScore).toBe(0);
  });

  it('survives a storage driver that refuses to write', () => {
    const readOnly = new MemoryStorageDriver();
    readOnly.set = () => false;
    const manager = new SaveManager(readOnly, 0);
    expect(() => {
      manager.update((draft) => {
        draft.profile.bestScore = 1;
      });
      manager.flush();
    }).not.toThrow();
    expect(manager.current.profile.bestScore).toBe(1);
  });

  it('exports and re-imports progress losslessly', () => {
    const manager = freshManager();
    manager.update((draft) => {
      draft.profile.bestScore = 5150;
      draft.profile.xp = 4200;
      draft.profile.unlockedSkins = ['cyan-pulse', 'violet-drift'];
    });

    const payload = manager.export();
    const target = freshManager();
    expect(target.import(payload)).toBe(true);
    expect(target.current.profile.bestScore).toBe(5150);
    expect(target.current.profile.xp).toBe(4200);
    expect(target.current.profile.unlockedSkins).toContain('violet-drift');
  });

  it('rejects an unparseable import without touching the existing save', () => {
    const manager = freshManager();
    manager.update((draft) => {
      draft.profile.bestScore = 99;
    });
    expect(manager.import('not json at all')).toBe(false);
    expect(manager.current.profile.bestScore).toBe(99);
  });

  it('wipes everything on reset', () => {
    const manager = freshManager();
    manager.update((draft) => {
      draft.profile.bestScore = 4321;
      draft.profile.fragments = 200;
    });
    const fresh = manager.reset();
    expect(fresh.profile.bestScore).toBe(0);
    expect(fresh.profile.fragments).toBe(0);
    expect(manager.current.profile.bestScore).toBe(0);
  });
});
