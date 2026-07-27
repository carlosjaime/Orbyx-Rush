'use client';

import { useMemo } from 'react';
import { ProgressBar, ScreenPanel } from '@/components/common/Panel';
import { ACHIEVEMENTS, type AchievementCategory } from '@/game/config/achievements';
import { useProfileStore } from '@/stores/useProfileStore';
import { useUiStore } from '@/stores/useUiStore';

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  skill: 'Habilidad',
  endurance: 'Resistencia',
  collection: 'Colección',
  dedication: 'Constancia',
};

/** Achievement list, driven entirely by the declarative catalogue. */
export function AchievementsScreen() {
  const closeScreen = useUiStore((state) => state.closeScreen);
  const achievements = useProfileStore((state) => state.profile.achievements);

  const grouped = useMemo(() => {
    const map = new Map<AchievementCategory, typeof ACHIEVEMENTS>();
    for (const definition of ACHIEVEMENTS) {
      const list = map.get(definition.category) ?? [];
      map.set(definition.category, [...list, definition]);
    }
    return map;
  }, []);

  const unlockedCount = ACHIEVEMENTS.filter(
    (definition) => (achievements[definition.id] ?? 0) >= definition.target,
  ).length;

  return (
    <ScreenPanel
      title="Logros"
      subtitle={`${unlockedCount} de ${ACHIEVEMENTS.length} desbloqueados`}
      onClose={closeScreen}
    >
      <div className="flex flex-col gap-5 pb-4">
        {[...grouped.entries()].map(([category, list]) => (
          <section key={category}>
            <h3 className="text-ink-faint mb-2 text-xs font-black tracking-[0.2em] uppercase">
              {CATEGORY_LABELS[category]}
            </h3>
            <ul className="flex flex-col gap-2">
              {list.map((definition) => {
                const progress = Math.min(achievements[definition.id] ?? 0, definition.target);
                const unlocked = progress >= definition.target;
                return (
                  <li
                    key={definition.id}
                    className={[
                      'panel-surface flex flex-col gap-2 p-3',
                      unlocked ? 'border-success/60' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-ink flex items-center gap-2 text-sm font-bold">
                          {definition.name}
                          {unlocked ? (
                            <span className="text-success text-[10px] font-black tracking-wider uppercase">
                              ✓ Completo
                            </span>
                          ) : null}
                        </p>
                        <p className="text-ink-muted mt-0.5 text-xs">{definition.description}</p>
                      </div>
                      <span className="text-ink-faint shrink-0 text-xs font-bold tabular-nums">
                        {progress.toLocaleString('es')}/{definition.target.toLocaleString('es')}
                      </span>
                    </div>
                    <ProgressBar
                      ratio={definition.target === 0 ? 1 : progress / definition.target}
                      label={`Progreso de ${definition.name}`}
                      tone={unlocked ? 'success' : 'primary'}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </ScreenPanel>
  );
}
