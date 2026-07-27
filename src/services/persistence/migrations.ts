import { SAVE_SCHEMA_VERSION, sanitizeSave, type SaveData } from '@/services/persistence/schema';

type RawSave = Record<string, unknown>;

/**
 * Ordered migration steps. Each entry upgrades a payload *from* the given
 * version to the next one. Steps must be pure and defensive: the input may be
 * partially corrupt, and the output is sanitised afterwards anyway.
 */
export interface Migration {
  from: number;
  to: number;
  describe: string;
  apply: (data: RawSave) => RawSave;
}

export const MIGRATIONS: Migration[] = [
  {
    from: 1,
    to: 2,
    describe: 'v1 stored a flat blob; split it into settings/profile and add cosmetics.',
    apply: (data) => {
      const legacy = data as { highScore?: number; volume?: number; profile?: RawSave };
      const profile = (legacy.profile ?? {}) as RawSave;
      return {
        ...data,
        settings: {
          ...(typeof data.settings === 'object' && data.settings !== null ? data.settings : {}),
          musicVolume: typeof legacy.volume === 'number' ? legacy.volume : undefined,
          sfxVolume: typeof legacy.volume === 'number' ? legacy.volume : undefined,
        },
        profile: {
          ...profile,
          bestScore: typeof legacy.highScore === 'number' ? legacy.highScore : profile.bestScore,
          unlockedSkins: ['cyan-pulse'],
          equippedSkin: 'cyan-pulse',
        },
        version: 2,
      };
    },
  },
  {
    from: 2,
    to: 3,
    describe: 'v3 introduces the daily challenge history and XP based levels.',
    apply: (data) => {
      const profile =
        typeof data.profile === 'object' && data.profile !== null
          ? ({ ...data.profile } as RawSave)
          : ({} as RawSave);
      if (typeof profile.xp !== 'number') profile.xp = 0;
      if (typeof profile.level !== 'number') profile.level = 1;
      if (!Array.isArray(profile.daysPlayed)) profile.daysPlayed = [];
      return {
        ...data,
        profile,
        daily: Array.isArray(data.daily) ? data.daily : [],
        version: 3,
      };
    },
  },
];

export interface MigrationResult {
  data: SaveData;
  migrated: boolean;
  appliedSteps: string[];
  /** Set when the payload was unreadable and defaults had to be used. */
  recovered: boolean;
}

/** Runs every applicable migration and sanitises the result. */
export function migrateSave(raw: unknown): MigrationResult {
  const appliedSteps: string[] = [];

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { data: sanitizeSave(undefined), migrated: false, appliedSteps, recovered: true };
  }

  let working = { ...(raw as RawSave) };
  let version = typeof working.version === 'number' ? working.version : 1;

  // A save from a *newer* build cannot be understood; keep what sanitises
  // cleanly rather than throwing the player's progress away.
  if (version > SAVE_SCHEMA_VERSION) {
    return { data: sanitizeSave(working), migrated: false, appliedSteps, recovered: true };
  }

  let guard = 0;
  while (version < SAVE_SCHEMA_VERSION && guard < MIGRATIONS.length + 1) {
    guard += 1;
    const step = MIGRATIONS.find((migration) => migration.from === version);
    if (!step) break;
    try {
      working = step.apply(working);
      appliedSteps.push(`${step.from}->${step.to}: ${step.describe}`);
      version = step.to;
    } catch (error) {
      console.warn('[SaveManager] migration failed, falling back to sanitised data', error);
      return { data: sanitizeSave(working), migrated: true, appliedSteps, recovered: true };
    }
  }

  return {
    data: sanitizeSave({ ...working, version: SAVE_SCHEMA_VERSION }),
    migrated: appliedSteps.length > 0,
    appliedSteps,
    recovered: false,
  };
}
