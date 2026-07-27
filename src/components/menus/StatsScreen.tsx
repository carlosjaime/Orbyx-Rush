'use client';

import { Card, ProgressBar, ScreenPanel, StatRow } from '@/components/common/Panel';
import { levelProgress } from '@/game/systems/progression';
import { useProfileStore } from '@/stores/useProfileStore';
import { useUiStore } from '@/stores/useUiStore';

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

export function StatsScreen() {
  const closeScreen = useUiStore((state) => state.closeScreen);
  const profile = useProfileStore((state) => state.profile);
  const level = levelProgress(profile.xp);
  const averageScore =
    profile.totalRuns > 0 ? Math.round(profile.bestScore / Math.max(1, profile.totalRuns)) : 0;

  return (
    <ScreenPanel
      title="Estadísticas"
      subtitle="Todo se guarda localmente en este dispositivo."
      onClose={closeScreen}
    >
      <div className="flex flex-col gap-4 pb-4">
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-ink text-lg font-black">
              Nivel {level.level}
              {level.isMaxLevel ? ' · MÁX' : ''}
            </span>
            <span className="text-ink-faint text-xs tabular-nums">
              {profile.xp.toLocaleString('es')} XP total
            </span>
          </div>
          <ProgressBar ratio={level.ratio} label="Progreso de nivel" />
        </Card>

        <Card>
          <StatRow
            label="Mejor puntuación"
            value={profile.bestScore.toLocaleString('es')}
            emphasis
          />
          <StatRow label="Mejor reto diario" value={profile.bestDailyScore.toLocaleString('es')} />
          <StatRow label="Combo máximo" value={`x${profile.maxCombo}`} />
          <StatRow label="Media por partida" value={averageScore.toLocaleString('es')} />
        </Card>

        <Card>
          <StatRow label="Partidas jugadas" value={profile.totalRuns.toLocaleString('es')} />
          <StatRow label="Tiempo total" value={formatDuration(profile.totalPlaySeconds)} />
          <StatRow label="Distancia acumulada" value={profile.totalDistance.toLocaleString('es')} />
          <StatRow label="Días jugados" value={profile.daysPlayed.length.toLocaleString('es')} />
        </Card>

        <Card>
          <StatRow
            label="Capturas perfectas"
            value={profile.totalPerfectCaptures.toLocaleString('es')}
          />
          <StatRow label="Pasadas al filo" value={profile.nearMissTotal.toLocaleString('es')} />
          <StatRow
            label="Fragmentos recogidos"
            value={profile.totalFragments.toLocaleString('es')}
          />
          <StatRow label="Fragmentos disponibles" value={profile.fragments.toLocaleString('es')} />
          <StatRow
            label="Retos diarios completados"
            value={profile.challengesCompleted.toLocaleString('es')}
          />
        </Card>
      </div>
    </ScreenPanel>
  );
}
