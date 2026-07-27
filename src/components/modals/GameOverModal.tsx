'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { ProgressBar, StatRow } from '@/components/common/Panel';
import { trackEvent } from '@/game/adapters/AnalyticsAdapter';
import { getPlatformAdapter } from '@/game/adapters/PlatformAdapter';
import { POWERUPS } from '@/game/config/balance';
import { gameBus } from '@/game/events/GameEvents';
import { levelProgress } from '@/game/systems/progression';
import { useGameEvent } from '@/hooks/useGameEvent';
import { useProfileStore } from '@/stores/useProfileStore';
import { useUiStore } from '@/stores/useUiStore';
import type { RunResult } from '@/game/types';

/**
 * Result screen.
 *
 * "Reintentar" is the primary action and restarts instantly without a page
 * reload, which is what keeps the "one more run" loop tight.
 */
export function GameOverModal() {
  const phase = useUiStore((state) => state.phase);
  const showToast = useUiStore((state) => state.showToast);
  const profile = useProfileStore((state) => state.profile);
  const spendFragments = useProfileStore((state) => state.spendFragments);
  const [result, setResult] = useState<RunResult | null>(null);
  const [canRevive, setCanRevive] = useState(false);

  useGameEvent('RUN_FINISHED', (payload) => setResult(payload));
  useGameEvent('PLAYER_DIED', ({ canRevive: allowed }) => setCanRevive(allowed));
  useGameEvent('RUN_STARTED', () => {
    setResult(null);
    setCanRevive(false);
  });

  // Enter/Space retry is handled globally; this only guards focus placement.
  useEffect(() => {
    if (phase === 'dead') {
      document.getElementById('retry-button')?.focus();
    }
  }, [phase]);

  if (phase !== 'dead' || !result) return null;

  const level = levelProgress(profile.xp);
  const reviveAffordable =
    canRevive &&
    profile.level >= POWERUPS.revive.unlockLevel &&
    profile.fragments >= POWERUPS.revive.fragmentCost;

  const share = async () => {
    const text =
      `Orbyx Rush · ${result.score.toLocaleString('es')} puntos, ` +
      `combo máximo x${result.maxCombo}, ${result.perfectCaptures} capturas perfectas.`;
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    const outcome = await getPlatformAdapter().share({
      title: 'Orbyx Rush',
      text,
      ...(url ? { url } : {}),
    });
    if (outcome === 'shared') {
      trackEvent({ name: 'share_result', method: 'web-share' });
    } else if (outcome === 'copied') {
      trackEvent({ name: 'share_result', method: 'clipboard' });
      showToast('Resultado copiado al portapapeles', 'success');
    } else {
      showToast('No se pudo compartir en este dispositivo', 'info');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resultado de la partida"
      className="bg-void/85 animate-fade-in absolute inset-0 z-40 flex items-center justify-center px-5 backdrop-blur-md"
    >
      <div className="panel-surface animate-pop flex max-h-full w-full max-w-sm flex-col gap-4 overflow-y-auto p-6">
        <ShareCard result={result} bestScore={profile.bestScore} />

        <div>
          <StatRow label="Mejor puntuación" value={profile.bestScore.toLocaleString('es')} />
          <StatRow label="Combo máximo" value={`x${result.maxCombo}`} />
          <StatRow label="Capturas perfectas" value={String(result.perfectCaptures)} />
          <StatRow label="Núcleos alcanzados" value={String(result.coresReached)} />
          <StatRow label="Pasadas al filo" value={String(result.nearMisses)} />
          <StatRow label="Fragmentos" value={`+${result.fragments}`} />
          <StatRow label="Tiempo" value={`${Math.round(result.durationSeconds)} s`} />
          <StatRow label="Experiencia" value={`+${result.xpGained} XP`} />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-ink text-sm font-bold">
              Nivel {level.level}
              {result.levelAfter > result.levelBefore ? (
                <span className="text-success ml-2 text-xs font-black uppercase">¡Subiste!</span>
              ) : null}
            </span>
            {!level.isMaxLevel ? (
              <span className="text-ink-faint text-xs tabular-nums">
                {level.xpIntoLevel}/{level.xpForNextLevel} XP
              </span>
            ) : null}
          </div>
          <ProgressBar ratio={level.ratio} label="Progreso de nivel" />
        </div>

        <div className="flex flex-col gap-2.5">
          <Button
            id="retry-button"
            data-testid="retry-button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => gameBus.emit('REQUEST_RESTART')}
          >
            Reintentar
          </Button>

          {canRevive ? (
            <Button
              size="md"
              fullWidth
              disabled={!reviveAffordable}
              onClick={() => {
                if (!spendFragments(POWERUPS.revive.fragmentCost)) return;
                gameBus.emit('REQUEST_REVIVE');
              }}
            >
              {profile.level < POWERUPS.revive.unlockLevel
                ? `Reanimar · nivel ${POWERUPS.revive.unlockLevel}`
                : `Reanimar · ${POWERUPS.revive.fragmentCost} fragmentos`}
            </Button>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5">
            <Button size="md" onClick={share}>
              Compartir
            </Button>
            <Button
              size="md"
              variant="ghost"
              onClick={() => gameBus.emit('REQUEST_QUIT_TO_MENU')}
              data-testid="quit-button"
            >
              Menú
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The visual card the player shares — rendered inline, no canvas export needed. */
function ShareCard({ result, bestScore }: { result: RunResult; bestScore: number }) {
  return (
    <div
      className="border-surface-border relative overflow-hidden rounded-2xl border p-5 text-center"
      style={{
        background:
          'radial-gradient(circle at 30% 15%, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 60%), radial-gradient(circle at 78% 85%, color-mix(in srgb, var(--color-secondary) 24%, transparent), transparent 62%), var(--color-void)',
      }}
    >
      <p className="text-ink-faint text-[10px] font-black tracking-[0.34em] uppercase">
        Orbyx Rush
      </p>
      {result.isNewRecord ? (
        <p className="text-warning neon-text mt-2 text-sm font-black tracking-[0.2em] uppercase">
          ¡Nuevo récord!
        </p>
      ) : (
        <p className="text-ink-muted mt-2 text-xs">Récord: {bestScore.toLocaleString('es')}</p>
      )}
      <p className="text-primary neon-text mt-1 text-5xl font-black tabular-nums">
        {result.score.toLocaleString('es')}
      </p>
      <div className="text-ink-muted mt-3 flex items-center justify-center gap-4 text-xs font-bold">
        <span>COMBO x{result.maxCombo}</span>
        <span aria-hidden="true">·</span>
        <span>{result.perfectCaptures} PERFECTAS</span>
      </div>
    </div>
  );
}
