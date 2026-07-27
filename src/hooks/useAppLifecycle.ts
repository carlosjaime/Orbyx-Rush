'use client';

import { useEffect } from 'react';
import { getPlatformAdapter } from '@/game/adapters/PlatformAdapter';
import { gameController } from '@/game/GameController';
import { gameBus } from '@/game/events/GameEvents';
import { getSaveManager } from '@/services/persistence/SaveManager';
import { getAudioManager } from '@/game/audio/AudioManager';
import { useUiStore } from '@/stores/useUiStore';

/**
 * App lifecycle: background/foreground, window blur and page unload.
 *
 * Pausing on blur is both a fairness feature (you never die because a
 * notification stole focus) and a battery feature (the loop stops entirely).
 */
export function useAppLifecycle(): void {
  useEffect(() => {
    const adapter = getPlatformAdapter();

    const handleActive = (active: boolean) => {
      const audio = getAudioManager();
      if (active) {
        gameController.resumeLoop();
        void audio.resume();
        return;
      }

      gameController.pauseLoop();
      void audio.suspend();
      getSaveManager().flush();

      // Only a live run needs pausing; menus can stay as they are.
      const phase = useUiStore.getState().phase;
      if (phase === 'playing') gameBus.emit('REQUEST_PAUSE');
    };

    const disposeAppState = adapter.onAppStateChange(handleActive);
    const onBlur = () => handleActive(false);
    const onFocus = () => handleActive(true);
    const onPageHide = () => getSaveManager().flush();

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      disposeAppState();
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
}

/**
 * Android hardware back button.
 *
 * Precedence: close a modal, then leave the pause menu, then ask before quitting
 * a run, and only exit the app from the bare main menu. The app must never
 * close out from under the player mid-run.
 */
export function useBackButton(): void {
  useEffect(() => {
    const adapter = getPlatformAdapter();

    const handle = () => {
      const ui = useUiStore.getState();

      if (ui.confirmExit) {
        ui.setConfirmExit(false);
        return;
      }
      if (ui.screenStack.length > 0) {
        ui.closeScreen();
        return;
      }
      if (ui.phase === 'paused') {
        gameBus.emit('REQUEST_RESUME');
        return;
      }
      if (ui.phase === 'playing' || ui.phase === 'tutorial') {
        gameBus.emit('REQUEST_PAUSE');
        return;
      }
      if (ui.phase === 'dead' || ui.phase === 'summary') {
        gameBus.emit('REQUEST_QUIT_TO_MENU');
        return;
      }
      ui.setConfirmExit(true);
    };

    return adapter.onBackButton(handle);
  }, []);
}
