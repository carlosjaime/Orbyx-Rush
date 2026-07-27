'use client';

import { Button } from '@/components/common/Button';
import { gameBus } from '@/game/events/GameEvents';
import { useUiStore } from '@/stores/useUiStore';

/** Pause menu. Resume is the primary action; quitting is deliberately secondary. */
export function PauseModal() {
  const phase = useUiStore((state) => state.phase);
  const openScreen = useUiStore((state) => state.openScreen);
  const hud = useUiStore((state) => state.hud);

  if (phase !== 'paused') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Juego en pausa"
      className="bg-void/80 animate-fade-in absolute inset-0 z-40 flex items-center justify-center px-6 backdrop-blur-md"
    >
      <div className="panel-surface animate-pop flex w-full max-w-sm flex-col gap-5 p-6">
        <div className="text-center">
          <h2 className="text-primary neon-text text-3xl font-black tracking-[0.16em] uppercase">
            Pausa
          </h2>
          <p className="text-ink-muted mt-2 text-sm">
            Puntuación actual:{' '}
            <span className="text-ink font-black tabular-nums">
              {hud.score.toLocaleString('es')}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            data-testid="resume-button"
            onClick={() => gameBus.emit('REQUEST_RESUME')}
          >
            Reanudar
          </Button>
          <Button size="md" fullWidth onClick={() => gameBus.emit('REQUEST_RESTART')}>
            Reiniciar partida
          </Button>
          <Button size="md" fullWidth onClick={() => openScreen('settings')}>
            Configuración
          </Button>
          <Button
            size="md"
            variant="ghost"
            fullWidth
            onClick={() => gameBus.emit('REQUEST_QUIT_TO_MENU')}
          >
            Salir al menú
          </Button>
        </div>
      </div>
    </div>
  );
}
