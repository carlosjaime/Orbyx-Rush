'use client';

import { create } from 'zustand';
import { gameBus } from '@/game/events/GameEvents';
import { getAudioManager } from '@/game/audio/AudioManager';
import { getHapticsManager } from '@/game/managers/HapticsManager';
import { trackEvent } from '@/game/adapters/AnalyticsAdapter';
import { getSaveManager } from '@/services/persistence/SaveManager';
import { DEFAULT_SETTINGS } from '@/services/persistence/schema';
import type { GameSettings } from '@/game/types';

interface SettingsState {
  settings: GameSettings;
  hydrated: boolean;
  /** Loads from disk. Safe to call more than once. */
  hydrate: () => void;
  set: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
  toggle: (key: KeysOfType<GameSettings, boolean>) => void;
  reset: () => void;
}

type KeysOfType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];

/** Pushes the settings into the non-React managers that need them. */
function applySettings(settings: GameSettings): void {
  const audio = getAudioManager();
  audio.setMusicVolume(settings.musicVolume);
  audio.setSfxVolume(settings.sfxVolume);
  audio.setMuted(settings.muted);
  getHapticsManager().setEnabled(settings.hapticsEnabled);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.highContrast = settings.highContrast ? 'true' : 'false';
    root.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
  }

  gameBus.emit('SETTINGS_CHANGED', settings);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const save = getSaveManager().load();
    const stored = save.data.settings;

    // Honour the OS accessibility preference the first time we ever run.
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const settings: GameSettings = {
      ...stored,
      reducedMotion: stored.reducedMotion || Boolean(prefersReduced),
      backgroundMotion: stored.backgroundMotion && !prefersReduced,
    };

    set({ settings, hydrated: true });
    applySettings(settings);
  },

  set: (key, value) => {
    const settings = { ...get().settings, [key]: value };
    set({ settings });
    getSaveManager().update((draft) => {
      draft.settings = settings;
    });
    applySettings(settings);
    trackEvent({ name: 'settings_changed', key: String(key) });
  },

  toggle: (key) => {
    const current = get().settings[key];
    get().set(key, !current as GameSettings[typeof key]);
  },

  reset: () => {
    const settings = { ...DEFAULT_SETTINGS };
    set({ settings });
    getSaveManager().update((draft) => {
      draft.settings = settings;
    });
    applySettings(settings);
  },
}));
