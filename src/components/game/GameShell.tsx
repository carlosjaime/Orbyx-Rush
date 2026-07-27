'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { GameBridge } from '@/components/game/GameBridge';
import { DebugPanel } from '@/components/game/DebugPanel';
import { Hud } from '@/components/hud/Hud';
import { MainMenu } from '@/components/menus/MainMenu';
import { AchievementsScreen } from '@/components/menus/AchievementsScreen';
import { DailyChallengeScreen } from '@/components/menus/DailyChallengeScreen';
import { CreditsScreen, PrivacyScreen, ResetConfirmScreen } from '@/components/menus/InfoScreens';
import { SettingsScreen } from '@/components/menus/SettingsScreen';
import { SkinsScreen } from '@/components/menus/SkinsScreen';
import { StatsScreen } from '@/components/menus/StatsScreen';
import { GameOverModal } from '@/components/modals/GameOverModal';
import { PauseModal } from '@/components/modals/PauseModal';
import {
  ExitConfirmOverlay,
  OrientationOverlay,
  SplashOverlay,
  ToastOverlay,
  TutorialOverlay,
  UpdateOverlay,
} from '@/components/modals/Overlays';
import { createConfiguredAdapter, setAnalyticsAdapter } from '@/game/adapters/AnalyticsAdapter';
import { getPlatformAdapter } from '@/game/adapters/PlatformAdapter';
import { debugState } from '@/game/config/debug';
import { useAppLifecycle, useBackButton } from '@/hooks/useAppLifecycle';
import { useAudioUnlock } from '@/hooks/useAudioUnlock';
import { useOrientationGuard } from '@/hooks/useOrientationGuard';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';

/**
 * Phaser is loaded lazily and client-side only. `ssr: false` guarantees the
 * engine bundle never reaches the server renderer and that `window`,
 * `document`, `localStorage` and the audio APIs are only ever touched in the
 * browser.
 */
const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), {
  ssr: false,
  loading: () => null,
});

/** The single client-side root of the application. */
export function GameShell() {
  const phase = useUiStore((state) => state.phase);
  const screen = useUiStore((state) => state.screen);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const hydrateProfile = useProfileStore((state) => state.hydrate);

  // Storage first: settings must exist before the engine reads the registry.
  useEffect(() => {
    hydrateSettings();
    hydrateProfile();
    setAnalyticsAdapter(createConfiguredAdapter(process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER));
    void getPlatformAdapter().initialise();

    const forcedSeed = process.env.NEXT_PUBLIC_FORCED_SEED;
    if (forcedSeed) debugState.set('forcedSeed', forcedSeed);
  }, [hydrateSettings, hydrateProfile]);

  useAudioUnlock();
  useAppLifecycle();
  useBackButton();
  useOrientationGuard();
  useServiceWorker();

  const showMenu = phase === 'menu';

  return (
    <main className="bg-void safe-area relative h-[100dvh] w-full overflow-hidden">
      {/*
        The canvas is always mounted: menus, pause and game over are overlays on
        top of it, so restarting a run never remounts the renderer.
      */}
      <GameCanvas />
      <GameBridge />

      <Hud />
      {showMenu ? <MainMenu /> : null}

      <TutorialOverlay />
      <PauseModal />
      <GameOverModal />

      {screen === 'skins' ? <SkinsScreen /> : null}
      {screen === 'daily' ? <DailyChallengeScreen /> : null}
      {screen === 'achievements' ? <AchievementsScreen /> : null}
      {screen === 'stats' ? <StatsScreen /> : null}
      {screen === 'settings' ? <SettingsScreen /> : null}
      {screen === 'credits' ? <CreditsScreen /> : null}
      {screen === 'privacy' ? <PrivacyScreen /> : null}
      {screen === 'reset-confirm' ? <ResetConfirmScreen /> : null}

      <ToastOverlay />
      <OrientationOverlay />
      <UpdateOverlay />
      <ExitConfirmOverlay />
      <SplashOverlay />
      <DebugPanel />
    </main>
  );
}
