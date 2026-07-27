'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { OrbyxMark } from '@/components/common/Logo';
import { gameBus } from '@/game/events/GameEvents';
import { applyServiceWorkerUpdate } from '@/hooks/useServiceWorker';
import { useGameEvent } from '@/hooks/useGameEvent';
import { getPlatformAdapter } from '@/game/adapters/PlatformAdapter';
import { useProfileStore } from '@/stores/useProfileStore';
import { useUiStore } from '@/stores/useUiStore';

/** Splash / preload screen shown until the engine reports it is ready. */
export function SplashOverlay() {
  const phase = useUiStore((state) => state.phase);
  const progress = useUiStore((state) => state.preloadProgress);
  if (phase !== 'booting') return null;

  return (
    <div className="bg-void absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8">
      <OrbyxMark size={120} className="animate-soft-pulse" />
      <div>
        <p className="neon-text text-primary text-center text-3xl font-black tracking-[0.24em]">
          ORBYX
        </p>
        <p className="text-secondary text-center text-xl font-bold tracking-[0.6em]">RUSH</p>
      </div>
      <div
        className="bg-surface-raised border-surface-border h-2 w-56 overflow-hidden rounded-full border"
        role="progressbar"
        aria-label="Cargando"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className="bg-primary h-full transition-[width] duration-200"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p className="text-ink-faint text-[10px] tracking-[0.2em] uppercase">RCMX</p>
    </div>
  );
}

/** Step-by-step tutorial hint bar. */
export function TutorialOverlay() {
  const phase = useUiStore((state) => state.phase);
  const markTutorialCompleted = useProfileStore((state) => state.markTutorialCompleted);
  const [hint, setHint] = useState<{ step: number; total: number; hint: string } | null>(null);

  useGameEvent('TUTORIAL_STEP', (payload) => setHint(payload));
  useGameEvent('TUTORIAL_COMPLETED', () => setHint(null));
  useGameEvent('RUN_STARTED', ({ mode }) => {
    if (mode !== 'tutorial') setHint(null);
  });

  if (phase !== 'tutorial' || !hint) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 px-6 pb-8">
      <div className="panel-surface animate-fade-in pointer-events-auto max-w-md px-5 py-4 text-center">
        <p className="text-primary text-[10px] font-black tracking-[0.24em] uppercase">
          Paso {hint.step} de {hint.total}
        </p>
        <p className="text-ink mt-2 text-base leading-relaxed font-semibold">{hint.hint}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="pointer-events-auto"
        onClick={() => {
          markTutorialCompleted();
          gameBus.emit('REQUEST_START_RUN', { mode: 'endless' });
        }}
      >
        Saltar tutorial
      </Button>
    </div>
  );
}

/** Transient toast used for unlocks, records and confirmations. */
export function ToastOverlay() {
  const toast = useUiStore((state) => state.toast);
  const dismissToast = useUiStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(dismissToast, 3200);
    return () => window.clearTimeout(id);
  }, [toast, dismissToast]);

  if (!toast) return null;

  const toneClass =
    toast.tone === 'success'
      ? 'border-success/70 text-success'
      : toast.tone === 'danger'
        ? 'border-danger/70 text-danger'
        : 'border-primary/70 text-primary';

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center px-4 pt-20"
    >
      <div
        className={`panel-surface animate-pop max-w-sm px-4 py-3 text-center text-sm font-bold ${toneClass}`}
      >
        {toast.message}
      </div>
    </div>
  );
}

/** Advisory landscape notice. Never traps the player. */
export function OrientationOverlay() {
  const blocked = useUiStore((state) => state.landscapeBlocked);
  const [dismissed, setDismissed] = useState(false);
  const [wasBlocked, setWasBlocked] = useState(blocked);

  // Adjusting state during render (React's documented pattern) instead of in an
  // effect: rotating back to portrait re-arms the notice with no extra render.
  if (wasBlocked !== blocked) {
    setWasBlocked(blocked);
    if (!blocked) setDismissed(false);
  }

  if (!blocked || dismissed) return null;

  return (
    <div className="bg-void/95 absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8 text-center backdrop-blur-lg">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <rect
          x="22"
          y="8"
          width="28"
          height="48"
          rx="5"
          stroke="var(--color-primary)"
          strokeWidth="3"
        />
        <path
          d="M14 62c6 4 14 6 22 6s16-2 22-6"
          stroke="var(--color-secondary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div>
        <p className="text-primary text-xl font-black tracking-wider uppercase">
          Gira el dispositivo
        </p>
        <p className="text-ink-muted mt-2 max-w-xs text-sm leading-relaxed">
          Orbyx Rush está diseñado para jugarse en vertical y con una sola mano.
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
        Continuar de todos modos
      </Button>
    </div>
  );
}

/** Discreet banner offered when a newer build is cached and waiting. */
export function UpdateOverlay() {
  const updateAvailable = useUiStore((state) => state.updateAvailable);
  const setUpdateAvailable = useUiStore((state) => state.setUpdateAvailable);
  if (!updateAvailable) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="panel-surface pointer-events-auto flex items-center gap-3 px-4 py-3">
        <p className="text-ink text-xs font-semibold">Hay una versión nueva disponible.</p>
        <Button size="sm" variant="primary" onClick={() => void applyServiceWorkerUpdate()}>
          Actualizar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setUpdateAvailable(false)}>
          Luego
        </Button>
      </div>
    </div>
  );
}

/** Android back-button exit confirmation. */
export function ExitConfirmOverlay() {
  const confirmExit = useUiStore((state) => state.confirmExit);
  const setConfirmExit = useUiStore((state) => state.setConfirmExit);
  if (!confirmExit) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar salida"
      className="bg-void/85 absolute inset-0 z-50 flex items-center justify-center px-6 backdrop-blur-md"
    >
      <div className="panel-surface animate-pop w-full max-w-xs p-6 text-center">
        <p className="text-ink text-base font-bold">¿Salir de Orbyx Rush?</p>
        <div className="mt-5 flex gap-2.5">
          <Button size="md" variant="ghost" fullWidth onClick={() => setConfirmExit(false)}>
            Cancelar
          </Button>
          <Button
            size="md"
            variant="danger"
            fullWidth
            onClick={() => {
              setConfirmExit(false);
              void getPlatformAdapter().exitApp();
            }}
          >
            Salir
          </Button>
        </div>
      </div>
    </div>
  );
}
