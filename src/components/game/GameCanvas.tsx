'use client';

import { useEffect, useRef } from 'react';
import { gameController } from '@/game/GameController';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

/**
 * Mounts the Phaser canvas.
 *
 * This component is loaded through `next/dynamic` with `ssr: false`, so nothing
 * inside it — including the whole Phaser bundle — is ever evaluated on the
 * server. The `Phaser.Game` instance itself is owned by `gameController`, not
 * by this component, which is what makes StrictMode and Fast Refresh safe.
 */
export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const settings = useSettingsStore((state) => state.settings);
  const profile = useProfileStore((state) => state.profile);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    let cancelled = false;
    void gameController
      .ensure(parent, {
        settings: useSettingsStore.getState().settings,
        cosmetics: {
          skinId: useProfileStore.getState().profile.equippedSkin,
          trailId: useProfileStore.getState().profile.equippedTrail,
          themeId: useProfileStore.getState().profile.equippedTheme,
        },
        bestScore: useProfileStore.getState().profile.bestScore,
      })
      .catch((error) => {
        if (!cancelled) console.error('[GameCanvas] failed to start Phaser', error);
      });

    return () => {
      cancelled = true;
      // The instance intentionally outlives this effect: React 18 StrictMode
      // mounts twice in development, and tearing down here would destroy the
      // renderer that the second mount is about to reuse. Real teardown happens
      // on page unload, where the browser reclaims everything anyway.
    };
  }, []);

  // Push React-owned state into the Phaser registry whenever it changes.
  useEffect(() => {
    gameController.pushState({ settings });
  }, [settings]);

  useEffect(() => {
    gameController.pushState({
      cosmetics: {
        skinId: profile.equippedSkin,
        trailId: profile.equippedTrail,
        themeId: profile.equippedTheme,
      },
      bestScore: profile.bestScore,
    });
  }, [profile.equippedSkin, profile.equippedTrail, profile.equippedTheme, profile.bestScore]);

  return (
    <div
      ref={containerRef}
      id="orbyx-canvas"
      data-testid="game-canvas"
      className="fixed inset-0 flex items-center justify-center"
      aria-label="Área de juego de Orbyx Rush"
      role="application"
    />
  );
}
