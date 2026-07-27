'use client';

import { useCallback, useEffect, useRef } from 'react';
import { trackEvent } from '@/game/adapters/AnalyticsAdapter';
import { getAudioManager } from '@/game/audio/AudioManager';
import { gameController } from '@/game/GameController';
import { gameBus } from '@/game/events/GameEvents';
import { dailySeedFor } from '@/game/systems/DailyChallengeSystem';
import { createRandomSeed } from '@/game/procedural/rng';
import { useGameEvent } from '@/hooks/useGameEvent';
import { useProfileStore } from '@/stores/useProfileStore';
import { useUiStore } from '@/stores/useUiStore';
import type { GameMode } from '@/game/types';

/**
 * The glue layer.
 *
 * Translates engine events into UI state and UI intents into engine commands.
 * It renders nothing — keeping it presentation-free means the HUD can re-render
 * without ever touching the run lifecycle.
 */
export function GameBridge() {
  const ui = useUiStore;
  const commitRun = useProfileStore((state) => state.commitRun);
  const markTutorialCompleted = useProfileStore((state) => state.markTutorialCompleted);
  /** Guards against a double commit if two death signals ever race. */
  const committedRef = useRef(false);

  // ---------------------------------------------------------------- engine ->

  useGameEvent('GAME_READY', () => {
    ui.getState().setGameReady(true);
    if (ui.getState().phase === 'booting') ui.getState().setPhase('menu');
    trackEvent({ name: 'game_started' });
  });

  useGameEvent('PRELOAD_PROGRESS', ({ progress }) => {
    ui.getState().setPreloadProgress(progress);
  });

  useGameEvent('HUD_TICK', (stats) => {
    ui.getState().setHud(stats);
  });

  useGameEvent('RUN_STARTED', ({ mode, seed }) => {
    committedRef.current = false;
    const state = ui.getState();
    state.setMode(mode, seed);
    state.setPhase(mode === 'tutorial' ? 'tutorial' : 'playing');
    state.closeAllScreens();
    state.resetHud();
    trackEvent({ name: 'run_started', mode });
    if (mode === 'daily') trackEvent({ name: 'daily_challenge_started', date: seed });
  });

  useGameEvent('RUN_PAUSED', () => {
    ui.getState().setPhase('paused');
  });

  useGameEvent('RUN_RESUMED', () => {
    const state = ui.getState();
    if (state.phase === 'paused' || state.phase === 'dead') {
      state.setPhase(state.mode === 'tutorial' ? 'tutorial' : 'playing');
    }
  });

  useGameEvent('PLAYER_DIED', ({ stats, mode, seed }) => {
    if (committedRef.current) return;
    committedRef.current = true;

    const result = commitRun(stats, mode, seed);
    ui.getState().setPhase('dead');
    gameBus.emit('RUN_FINISHED', result);

    if (mode === 'daily') {
      trackEvent({ name: 'daily_challenge_completed', date: seed, score: result.score });
    }
  });

  useGameEvent('TUTORIAL_COMPLETED', () => {
    markTutorialCompleted();
    ui.getState().showToast('Tutorial completado. ¡A jugar!', 'success');
    // Roll straight into a real run: momentum matters more than a menu trip.
    window.setTimeout(() => gameController.startRun('endless', createRandomSeed()), 1400);
  });

  useGameEvent('REWARD_GRANTED', ({ kind, label }) => {
    getAudioManager().playSfx('unlock');
    ui.getState().showToast(
      kind === 'achievement' ? `Logro desbloqueado: ${label}` : `¡Nuevo desbloqueo: ${label}!`,
      'success',
    );
  });

  useGameEvent('HIGH_SCORE_CHANGED', ({ score }) => {
    ui.getState().showToast(`¡Nuevo récord: ${score.toLocaleString('es')}!`, 'success');
  });

  // ---------------------------------------------------------------- -> engine

  const startRun = useCallback((mode: GameMode, seed?: string) => {
    const resolvedSeed = seed ?? (mode === 'daily' ? dailySeedFor() : createRandomSeed());
    committedRef.current = false;
    gameController.startRun(mode, resolvedSeed);
  }, []);

  useGameEvent('REQUEST_START_RUN', ({ mode, seed }) => startRun(mode, seed));

  useGameEvent('REQUEST_QUIT_TO_MENU', () => {
    const state = ui.getState();
    state.setPhase('menu');
    state.closeAllScreens();
    state.resetHud();
    gameController.showMenu();
    getAudioManager().startMusic('menu');
  });

  // Restarting from the death screen must be instant and must not reload.
  useGameEvent('REQUEST_RESTART', () => {
    committedRef.current = false;
    const state = ui.getState();
    if (state.phase === 'dead' || state.phase === 'summary') {
      startRun(state.mode, state.mode === 'daily' ? dailySeedFor() : undefined);
    }
  });

  // Keyboard shortcuts that must work outside the canvas (overlays have focus).
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const state = ui.getState();
      if (event.key === 'Escape') {
        if (state.screenStack.length > 0) {
          event.preventDefault();
          state.closeScreen();
          return;
        }
        if (state.phase === 'playing' || state.phase === 'tutorial') {
          event.preventDefault();
          gameBus.emit('REQUEST_PAUSE');
        } else if (state.phase === 'paused') {
          event.preventDefault();
          gameBus.emit('REQUEST_RESUME');
        }
        return;
      }

      if ((event.key === 'Enter' || event.key === ' ') && state.phase === 'dead') {
        event.preventDefault();
        gameBus.emit('REQUEST_RESTART');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ui]);

  return null;
}
