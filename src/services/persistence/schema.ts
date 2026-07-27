import { AUDIO } from '@/game/config/balance';
import type { GameSettings, PlayerProfile } from '@/game/types';

/** Bump this whenever the persisted shape changes, and add a migration. */
export const SAVE_SCHEMA_VERSION = 3;

export const STORAGE_KEYS = {
  save: 'orbyx-rush:save',
  /** Written before a risky change so a crash cannot lose everything. */
  backup: 'orbyx-rush:save.backup',
} as const;

export interface DailyChallengeRecord {
  /** UTC day key, `YYYY-MM-DD`. */
  date: string;
  bestScore: number;
  attempts: number;
  completed: boolean;
}

export interface SaveData {
  version: number;
  updatedAt: number;
  settings: GameSettings;
  profile: PlayerProfile;
  daily: DailyChallengeRecord[];
}

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: AUDIO.defaultMusicVolume,
  sfxVolume: AUDIO.defaultSfxVolume,
  muted: false,
  hapticsEnabled: true,
  screenShakeEnabled: true,
  reducedMotion: false,
  reducedFlashes: false,
  backgroundMotion: true,
  particleQuality: 'high',
  highContrast: false,
  powerSaver: false,
  showKeyboardHints: true,
};

export const DEFAULT_PROFILE: PlayerProfile = {
  bestScore: 0,
  bestDailyScore: 0,
  totalRuns: 0,
  totalDistance: 0,
  totalFragments: 0,
  fragments: 0,
  totalPerfectCaptures: 0,
  maxCombo: 0,
  totalPlaySeconds: 0,
  challengesCompleted: 0,
  daysPlayed: [],
  xp: 0,
  level: 1,
  unlockedSkins: ['cyan-pulse'],
  equippedSkin: 'cyan-pulse',
  unlockedTrails: ['plasma'],
  equippedTrail: 'plasma',
  unlockedThemes: ['deep-void'],
  equippedTheme: 'deep-void',
  achievements: {},
  tutorialCompleted: false,
  lastDailyDate: null,
  lastDailyBest: 0,
  nearMissTotal: 0,
};

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_SCHEMA_VERSION,
    updatedAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS },
    profile: { ...DEFAULT_PROFILE, daysPlayed: [], achievements: {} },
    daily: [],
  };
}

// --------------------------------------------------------------- validation

type Unknown = Record<string, unknown>;

function isObject(value: unknown): value is Unknown {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(Math.max(parsed, min), max);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const filtered = value.filter((item): item is string => typeof item === 'string');
  return Array.from(new Set([...fallback, ...filtered]));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Coerces arbitrary parsed JSON into a valid `SaveData`.
 *
 * Any unknown, missing or corrupt field silently falls back to its default —
 * a broken save must never prevent the game from starting.
 */
export function sanitizeSave(input: unknown): SaveData {
  const base = createDefaultSave();
  if (!isObject(input)) return base;

  const settingsInput = isObject(input.settings) ? input.settings : {};
  const profileInput = isObject(input.profile) ? input.profile : {};

  const settings: GameSettings = {
    musicVolume: num(settingsInput.musicVolume, DEFAULT_SETTINGS.musicVolume, 0, 1),
    sfxVolume: num(settingsInput.sfxVolume, DEFAULT_SETTINGS.sfxVolume, 0, 1),
    muted: bool(settingsInput.muted, DEFAULT_SETTINGS.muted),
    hapticsEnabled: bool(settingsInput.hapticsEnabled, DEFAULT_SETTINGS.hapticsEnabled),
    screenShakeEnabled: bool(settingsInput.screenShakeEnabled, DEFAULT_SETTINGS.screenShakeEnabled),
    reducedMotion: bool(settingsInput.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    reducedFlashes: bool(settingsInput.reducedFlashes, DEFAULT_SETTINGS.reducedFlashes),
    backgroundMotion: bool(settingsInput.backgroundMotion, DEFAULT_SETTINGS.backgroundMotion),
    particleQuality: oneOf(
      settingsInput.particleQuality,
      ['low', 'medium', 'high'] as const,
      DEFAULT_SETTINGS.particleQuality,
    ),
    highContrast: bool(settingsInput.highContrast, DEFAULT_SETTINGS.highContrast),
    powerSaver: bool(settingsInput.powerSaver, DEFAULT_SETTINGS.powerSaver),
    showKeyboardHints: bool(settingsInput.showKeyboardHints, DEFAULT_SETTINGS.showKeyboardHints),
  };

  const achievements: Record<string, number> = {};
  if (isObject(profileInput.achievements)) {
    for (const [key, value] of Object.entries(profileInput.achievements)) {
      if (typeof value === 'number' && Number.isFinite(value)) achievements[key] = value;
    }
  }

  const unlockedSkins = stringArray(profileInput.unlockedSkins, DEFAULT_PROFILE.unlockedSkins);
  const unlockedTrails = stringArray(profileInput.unlockedTrails, DEFAULT_PROFILE.unlockedTrails);
  const unlockedThemes = stringArray(profileInput.unlockedThemes, DEFAULT_PROFILE.unlockedThemes);

  const equipped = (value: unknown, pool: string[], fallback: string): string => {
    const candidate = str(value, fallback);
    return pool.includes(candidate) ? candidate : fallback;
  };

  const profile: PlayerProfile = {
    bestScore: Math.round(num(profileInput.bestScore, 0, 0)),
    bestDailyScore: Math.round(num(profileInput.bestDailyScore, 0, 0)),
    totalRuns: Math.round(num(profileInput.totalRuns, 0, 0)),
    totalDistance: Math.round(num(profileInput.totalDistance, 0, 0)),
    totalFragments: Math.round(num(profileInput.totalFragments, 0, 0)),
    fragments: Math.round(num(profileInput.fragments, 0, 0)),
    totalPerfectCaptures: Math.round(num(profileInput.totalPerfectCaptures, 0, 0)),
    maxCombo: Math.round(num(profileInput.maxCombo, 0, 0)),
    totalPlaySeconds: Math.round(num(profileInput.totalPlaySeconds, 0, 0)),
    challengesCompleted: Math.round(num(profileInput.challengesCompleted, 0, 0)),
    daysPlayed: Array.isArray(profileInput.daysPlayed)
      ? Array.from(
          new Set(profileInput.daysPlayed.filter((d): d is string => typeof d === 'string')),
        ).slice(-400)
      : [],
    xp: Math.round(num(profileInput.xp, 0, 0)),
    level: Math.round(num(profileInput.level, 1, 1)),
    unlockedSkins,
    equippedSkin: equipped(profileInput.equippedSkin, unlockedSkins, DEFAULT_PROFILE.equippedSkin),
    unlockedTrails,
    equippedTrail: equipped(
      profileInput.equippedTrail,
      unlockedTrails,
      DEFAULT_PROFILE.equippedTrail,
    ),
    unlockedThemes,
    equippedTheme: equipped(
      profileInput.equippedTheme,
      unlockedThemes,
      DEFAULT_PROFILE.equippedTheme,
    ),
    achievements,
    tutorialCompleted: bool(profileInput.tutorialCompleted, false),
    lastDailyDate:
      typeof profileInput.lastDailyDate === 'string' ? profileInput.lastDailyDate : null,
    lastDailyBest: Math.round(num(profileInput.lastDailyBest, 0, 0)),
    nearMissTotal: Math.round(num(profileInput.nearMissTotal, 0, 0)),
  };

  const daily: DailyChallengeRecord[] = Array.isArray(input.daily)
    ? input.daily
        .filter(isObject)
        .map((entry) => ({
          date: str(entry.date, ''),
          bestScore: Math.round(num(entry.bestScore, 0, 0)),
          attempts: Math.round(num(entry.attempts, 0, 0)),
          completed: bool(entry.completed, false),
        }))
        .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
        // Only the last 60 days are ever shown; cap the payload size.
        .slice(-60)
    : [];

  return {
    version: SAVE_SCHEMA_VERSION,
    updatedAt: num(input.updatedAt, Date.now(), 0),
    settings,
    profile,
    daily,
  };
}
