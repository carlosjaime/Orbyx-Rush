'use client';

import { useEffect } from 'react';
import { getAudioManager } from '@/game/audio/AudioManager';
import { useSettingsStore } from '@/stores/useSettingsStore';

/**
 * Unlocks the Web Audio context on the first real user gesture.
 *
 * Every mobile browser blocks audio until then, so we listen once for any of
 * pointer/key/touch, start the context, and immediately drop the listeners.
 */
export function useAudioUnlock(): void {
  const settings = useSettingsStore((state) => state.settings);

  useEffect(() => {
    const audio = getAudioManager();
    if (audio.isUnlocked) return;

    let disposed = false;

    const unlock = async () => {
      const ok = await audio.unlock();
      if (!ok || disposed) return;
      audio.setMusicVolume(settings.musicVolume);
      audio.setSfxVolume(settings.sfxVolume);
      audio.setMuted(settings.muted);
      audio.startMusic('menu');
      remove();
    };

    const handler = () => void unlock();
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    const remove = () => {
      for (const event of events) window.removeEventListener(event, handler);
    };

    for (const event of events) window.addEventListener(event, handler, { passive: true });
    return () => {
      disposed = true;
      remove();
    };
  }, [settings.muted, settings.musicVolume, settings.sfxVolume]);
}

/**
 * Suspends audio when the tab or the app goes to the background and restores it
 * on return. Handles iOS/Android interruptions (calls, other apps) too.
 */
export function useAudioLifecycle(active: boolean): void {
  useEffect(() => {
    const audio = getAudioManager();
    if (active) {
      void audio.resume();
    } else {
      void audio.suspend();
    }
  }, [active]);
}
