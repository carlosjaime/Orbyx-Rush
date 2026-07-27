'use client';

import { Button } from '@/components/common/Button';
import { OrbyxLockup } from '@/components/common/Logo';
import { ProgressBar } from '@/components/common/Panel';
import { gameBus } from '@/game/events/GameEvents';
import { levelProgress } from '@/game/systems/progression';
import { useProfileStore } from '@/stores/useProfileStore';
import { useUiStore } from '@/stores/useUiStore';

/**
 * Main menu.
 *
 * One dominant action ("Jugar") and a compact row of secondary destinations —
 * the whole thing is reachable with one thumb on a phone.
 */
export function MainMenu() {
  const profile = useProfileStore((state) => state.profile);
  const openScreen = useUiStore((state) => state.openScreen);
  const gameReady = useUiStore((state) => state.gameReady);
  const level = levelProgress(profile.xp);

  const play = () => {
    // First-timers are routed through the tutorial automatically.
    gameBus.emit('REQUEST_START_RUN', {
      mode: profile.tutorialCompleted ? 'endless' : 'tutorial',
    });
  };

  return (
    <div className="animate-fade-in absolute inset-0 z-30 flex flex-col items-center justify-between px-6 py-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6 pt-4">
        <OrbyxLockup />

        <div className="panel-surface flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-ink-faint text-[10px] font-bold tracking-[0.2em] uppercase">
              Récord
            </p>
            <p className="text-primary neon-text text-2xl font-black tabular-nums">
              {profile.bestScore.toLocaleString('es')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-ink-faint text-[10px] font-bold tracking-[0.2em] uppercase">
              Fragmentos
            </p>
            <p className="text-ember text-2xl font-black tabular-nums">
              {profile.fragments.toLocaleString('es')}
            </p>
          </div>
        </div>

        <div className="w-full">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-ink text-sm font-bold">
              Nivel {level.level}
              {level.isMaxLevel ? ' · MÁX' : ''}
            </span>
            {!level.isMaxLevel ? (
              <span className="text-ink-faint text-xs tabular-nums">
                {level.xpIntoLevel} / {level.xpForNextLevel} XP
              </span>
            ) : null}
          </div>
          <ProgressBar ratio={level.ratio} label={`Progreso al nivel ${level.level + 1}`} />
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <Button
          variant="primary"
          size="hero"
          fullWidth
          onClick={play}
          disabled={!gameReady}
          data-testid="play-button"
        >
          {gameReady ? 'Jugar' : 'Cargando…'}
        </Button>

        <div className="grid w-full grid-cols-2 gap-2.5">
          <Button size="md" onClick={() => openScreen('daily')} data-testid="daily-button">
            Reto diario
          </Button>
          <Button size="md" onClick={() => openScreen('skins')} data-testid="skins-button">
            Apariencias
          </Button>
          <Button size="md" onClick={() => openScreen('achievements')}>
            Logros
          </Button>
          <Button size="md" onClick={() => openScreen('stats')}>
            Estadísticas
          </Button>
        </div>

        <div className="flex w-full items-center justify-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openScreen('settings')}
            data-testid="settings-button"
          >
            Configuración
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => gameBus.emit('REQUEST_START_RUN', { mode: 'tutorial' })}
          >
            Tutorial
          </Button>
          <Button size="sm" variant="ghost" onClick={() => openScreen('credits')}>
            Créditos
          </Button>
        </div>

        <p className="text-ink-faint text-center text-[10px] leading-relaxed">
          Desarrollado por RCMX
          <br />© 2026 RCMX. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
