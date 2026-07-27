'use client';

import { create } from 'zustand';
import { trackEvent } from '@/game/adapters/AnalyticsAdapter';
import { findCosmetic } from '@/game/config/cosmetics';
import { gameBus } from '@/game/events/GameEvents';
import { applyRunToProfile } from '@/game/systems/RewardSystem';
import { recordDailyAttempt } from '@/game/systems/DailyChallengeSystem';
import { getSaveManager } from '@/services/persistence/SaveManager';
import { DEFAULT_PROFILE, type DailyChallengeRecord } from '@/services/persistence/schema';
import type { GameMode, PlayerProfile, RunResult, RunStats } from '@/game/types';

interface ProfileState {
  profile: PlayerProfile;
  daily: DailyChallengeRecord[];
  hydrated: boolean;
  lastResult: RunResult | null;

  hydrate: () => void;
  /** Merges a finished run: records, XP, achievements and cosmetics. */
  commitRun: (stats: RunStats, mode: GameMode, seed: string) => RunResult;
  equip: (category: 'skin' | 'trail' | 'theme', id: string) => void;
  markTutorialCompleted: () => void;
  spendFragments: (amount: number) => boolean;
  resetProgress: () => void;
  exportProgress: () => string;
  importProgress: (json: string) => boolean;
  clearLastResult: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: { ...DEFAULT_PROFILE },
  daily: [],
  hydrated: false,
  lastResult: null,

  hydrate: () => {
    if (get().hydrated) return;
    const { data } = getSaveManager().load();
    set({ profile: data.profile, daily: data.daily, hydrated: true });
  },

  commitRun: (stats, mode, seed) => {
    const { profile, result, unlockedCosmetics, unlockedAchievements } = applyRunToProfile({
      profile: get().profile,
      stats,
      mode,
      seed,
    });

    const daily =
      mode === 'daily'
        ? recordDailyAttempt(get().daily, stats.score, stats.coresReached > 0)
        : get().daily;

    set({ profile, daily, lastResult: result });
    getSaveManager().update((draft) => {
      draft.profile = profile;
      draft.daily = daily;
    });
    getSaveManager().flush();

    if (result.isNewRecord) {
      gameBus.emit('HIGH_SCORE_CHANGED', { score: result.score, previous: result.previousBest });
      trackEvent({ name: 'high_score_reached', score: result.score });
    }
    for (const cosmetic of unlockedCosmetics) {
      gameBus.emit('REWARD_GRANTED', {
        kind: cosmetic.category,
        id: cosmetic.id,
        label: cosmetic.name,
      });
      trackEvent({ name: 'skin_unlocked', id: cosmetic.id });
    }
    for (const achievement of unlockedAchievements) {
      gameBus.emit('REWARD_GRANTED', {
        kind: 'achievement',
        id: achievement.id,
        label: achievement.name,
      });
      trackEvent({ name: 'achievement_unlocked', id: achievement.id });
    }
    trackEvent({
      name: 'run_finished',
      score: result.score,
      durationSeconds: Math.round(result.durationSeconds),
      coresReached: result.coresReached,
    });

    return result;
  },

  equip: (category, id) => {
    const profile = get().profile;
    const owned =
      category === 'skin'
        ? profile.unlockedSkins
        : category === 'trail'
          ? profile.unlockedTrails
          : profile.unlockedThemes;
    if (!owned.includes(id) || !findCosmetic(id)) return;

    const next: PlayerProfile = {
      ...profile,
      equippedSkin: category === 'skin' ? id : profile.equippedSkin,
      equippedTrail: category === 'trail' ? id : profile.equippedTrail,
      equippedTheme: category === 'theme' ? id : profile.equippedTheme,
    };
    set({ profile: next });
    getSaveManager().update((draft) => {
      draft.profile = next;
    });
  },

  markTutorialCompleted: () => {
    if (get().profile.tutorialCompleted) return;
    const next = { ...get().profile, tutorialCompleted: true };
    set({ profile: next });
    getSaveManager().update((draft) => {
      draft.profile = next;
    });
    trackEvent({ name: 'tutorial_completed' });
  },

  spendFragments: (amount) => {
    const profile = get().profile;
    if (amount <= 0 || profile.fragments < amount) return false;
    const next = { ...profile, fragments: profile.fragments - amount };
    set({ profile: next });
    getSaveManager().update((draft) => {
      draft.profile = next;
    });
    return true;
  },

  resetProgress: () => {
    const fresh = getSaveManager().reset();
    set({ profile: fresh.profile, daily: fresh.daily, lastResult: null });
  },

  exportProgress: () => getSaveManager().export(),

  importProgress: (json) => {
    const ok = getSaveManager().import(json);
    if (!ok) return false;
    const { data } = { data: getSaveManager().current };
    set({ profile: data.profile, daily: data.daily });
    return true;
  },

  clearLastResult: () => set({ lastResult: null }),
}));
