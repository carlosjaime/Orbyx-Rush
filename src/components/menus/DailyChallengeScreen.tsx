'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/common/Button';
import { Card, ScreenPanel, StatRow } from '@/components/common/Panel';
import { gameBus } from '@/game/events/GameEvents';
import {
  buildDemoLeaderboard,
  formatCountdown,
  readDailyState,
} from '@/game/systems/DailyChallengeSystem';
import { useProfileStore } from '@/stores/useProfileStore';
import { useUiStore } from '@/stores/useUiStore';

/**
 * Daily challenge hub.
 *
 * The seed is the UTC date, so everyone plays the identical track. Attempts are
 * unlimited and nothing about it is monetised.
 */
export function DailyChallengeScreen() {
  const closeScreen = useUiStore((state) => state.closeScreen);
  const daily = useProfileStore((state) => state.daily);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const state = useMemo(() => readDailyState(daily, now), [daily, now]);
  const leaderboard = useMemo(
    () => buildDemoLeaderboard(state.bestScore, state.seed),
    [state.bestScore, state.seed],
  );

  return (
    <ScreenPanel
      title="Reto diario"
      subtitle="Mismo trazado para todo el mundo, generado desde la fecha UTC."
      onClose={closeScreen}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          data-testid="daily-play"
          onClick={() => gameBus.emit('REQUEST_START_RUN', { mode: 'daily', seed: state.seed })}
        >
          Jugar reto de hoy
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pb-4">
        <Card>
          <StatRow label="Fecha (UTC)" value={state.date} />
          <StatRow label="Semilla" value={<code className="text-xs">{state.seed}</code>} />
          <StatRow
            label="Tu mejor puntuación de hoy"
            value={state.bestScore.toLocaleString('es')}
            emphasis
          />
          <StatRow label="Intentos" value={`${state.attempts} · ilimitados`} />
          <StatRow label="Próximo reto en" value={formatCountdown(state.millisRemaining)} />
        </Card>

        <section>
          <h3 className="text-ink-faint mb-2 text-xs font-black tracking-[0.2em] uppercase">
            Clasificación
          </h3>
          <div className="border-warning/40 bg-warning/10 mb-3 rounded-xl border p-3">
            <p className="text-warning text-xs leading-relaxed font-bold">Datos de demostración</p>
            <p className="text-ink-muted mt-1 text-xs leading-relaxed">
              Esta versión no tiene servidor. Las entradas marcadas como demo son ficticias y
              generadas localmente: no representan a jugadores reales. Solo tu puntuación es real y
              se guarda únicamente en este dispositivo.
            </p>
          </div>
          <ol className="flex flex-col gap-1.5">
            {leaderboard.map((entry) => (
              <li
                key={`${entry.rank}-${entry.name}`}
                className={[
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                  entry.isPlayer
                    ? 'border-primary bg-primary/10'
                    : 'border-surface-border bg-surface/60',
                ].join(' ')}
              >
                <span className="text-ink-faint w-6 text-sm font-black tabular-nums">
                  {entry.rank}
                </span>
                <span className="text-ink flex-1 truncate text-sm font-bold">
                  {entry.name}
                  {entry.isDemo ? (
                    <span className="text-ink-faint ml-2 text-[10px] font-bold tracking-wider uppercase">
                      demo
                    </span>
                  ) : null}
                </span>
                <span className="text-ink text-sm font-black tabular-nums">
                  {entry.score.toLocaleString('es')}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </ScreenPanel>
  );
}
