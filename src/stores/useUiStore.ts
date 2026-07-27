'use client';

import { create } from 'zustand';
import { createEmptyRunStats } from '@/game/systems/RewardSystem';
import type { MenuScreen } from '@/game/events/GameEvents';
import type { GameMode, RunStats } from '@/game/types';

/** Coarse-grained view state of the whole application shell. */
export type AppPhase = 'booting' | 'menu' | 'tutorial' | 'playing' | 'paused' | 'dead' | 'summary';

interface UiState {
  phase: AppPhase;
  /** Currently open overlay screen, or null when the game is unobstructed. */
  screen: MenuScreen | null;
  /** Stack of screens so the Android back button unwinds them one by one. */
  screenStack: MenuScreen[];
  gameReady: boolean;
  preloadProgress: number;
  mode: GameMode;
  seed: string;
  /** Throttled HUD mirror of the live run. Never updated per frame. */
  hud: RunStats;
  toast: { id: number; message: string; tone: 'info' | 'success' | 'danger' } | null;
  landscapeBlocked: boolean;
  updateAvailable: boolean;
  confirmExit: boolean;

  setPhase: (phase: AppPhase) => void;
  openScreen: (screen: MenuScreen) => void;
  closeScreen: () => void;
  closeAllScreens: () => void;
  setGameReady: (ready: boolean) => void;
  setPreloadProgress: (progress: number) => void;
  setMode: (mode: GameMode, seed: string) => void;
  setHud: (hud: RunStats) => void;
  resetHud: () => void;
  showToast: (message: string, tone?: 'info' | 'success' | 'danger') => void;
  dismissToast: () => void;
  setLandscapeBlocked: (blocked: boolean) => void;
  setUpdateAvailable: (available: boolean) => void;
  setConfirmExit: (value: boolean) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set, get) => ({
  phase: 'booting',
  screen: null,
  screenStack: [],
  gameReady: false,
  preloadProgress: 0,
  mode: 'endless',
  seed: '',
  hud: createEmptyRunStats(),
  toast: null,
  landscapeBlocked: false,
  updateAvailable: false,
  confirmExit: false,

  setPhase: (phase) => set({ phase }),

  openScreen: (screen) => {
    const stack = get().screenStack;
    // Re-opening the current screen is a no-op rather than a duplicate entry.
    if (stack[stack.length - 1] === screen) return;
    set({ screen, screenStack: [...stack, screen] });
  },

  closeScreen: () => {
    const stack = [...get().screenStack];
    stack.pop();
    set({ screenStack: stack, screen: stack[stack.length - 1] ?? null });
  },

  closeAllScreens: () => set({ screen: null, screenStack: [] }),

  setGameReady: (gameReady) => set({ gameReady }),
  setPreloadProgress: (preloadProgress) => set({ preloadProgress }),
  setMode: (mode, seed) => set({ mode, seed }),
  setHud: (hud) => set({ hud }),
  resetHud: () => set({ hud: createEmptyRunStats() }),

  showToast: (message, tone = 'info') => {
    toastId += 1;
    set({ toast: { id: toastId, message, tone } });
  },

  dismissToast: () => set({ toast: null }),
  setLandscapeBlocked: (landscapeBlocked) => set({ landscapeBlocked }),
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
  setConfirmExit: (confirmExit) => set({ confirmExit }),
}));
