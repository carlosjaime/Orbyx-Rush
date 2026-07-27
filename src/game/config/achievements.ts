import type { PlayerProfile, RunStats } from '@/game/types';

/**
 * Declarative achievement catalogue.
 *
 * Each achievement exposes a pure `progress(context)` returning a value in the
 * same unit as `target`. No achievement logic lives anywhere else — adding one
 * means adding an entry here and nothing more.
 */

export type AchievementCategory = 'skill' | 'endurance' | 'collection' | 'dedication';

export interface AchievementContext {
  /** Stats of the run that just finished (zeroed outside of a run). */
  run: RunStats;
  /** Profile *after* the run has been merged in. */
  profile: PlayerProfile;
  /** Best perfect-capture streak achieved in the finished run. */
  bestPerfectStreak: number;
  /** Whether the finished run was a daily challenge. */
  wasDaily: boolean;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  target: number;
  /** Progress in `[0, target]`. Values above target are clamped by the system. */
  progress: (context: AchievementContext) => number;
  /** Hidden achievements are shown as "???" until unlocked. */
  hidden?: boolean;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first-orbit',
    name: 'Primera Órbita',
    description: 'Completa tu primera partida.',
    category: 'dedication',
    target: 1,
    progress: (c) => c.profile.totalRuns,
  },
  {
    id: 'first-perfect',
    name: 'Precisión Inicial',
    description: 'Consigue tu primera captura perfecta.',
    category: 'skill',
    target: 1,
    progress: (c) => c.profile.totalPerfectCaptures,
  },
  {
    id: 'combo-10',
    name: 'Cadena Estable',
    description: 'Alcanza un combo de 10.',
    category: 'skill',
    target: 10,
    progress: (c) => c.profile.maxCombo,
  },
  {
    id: 'combo-25',
    name: 'Resonancia',
    description: 'Alcanza un combo de 25.',
    category: 'skill',
    target: 25,
    progress: (c) => c.profile.maxCombo,
  },
  {
    id: 'combo-50',
    name: 'Sobrecarga',
    description: 'Alcanza un combo de 50.',
    category: 'skill',
    target: 50,
    progress: (c) => c.profile.maxCombo,
  },
  {
    id: 'perfect-chain-10',
    name: 'Cadena Perfecta',
    description: 'Encadena 10 capturas perfectas seguidas.',
    category: 'skill',
    target: 10,
    progress: (c) => c.bestPerfectStreak,
  },
  {
    id: 'survive-60',
    name: 'Un Minuto en el Vacío',
    description: 'Sobrevive 60 segundos en una sola partida.',
    category: 'endurance',
    target: 60,
    progress: (c) => Math.floor(c.run.durationSeconds),
  },
  {
    id: 'survive-120',
    name: 'Resistencia',
    description: 'Sobrevive 120 segundos en una sola partida.',
    category: 'endurance',
    target: 120,
    progress: (c) => Math.floor(c.run.durationSeconds),
  },
  {
    id: 'score-10k',
    name: 'Diez Mil',
    description: 'Consigue 10 000 puntos en una partida.',
    category: 'skill',
    target: 10000,
    progress: (c) => c.profile.bestScore,
  },
  {
    id: 'score-25k',
    name: 'Veinticinco Mil',
    description: 'Consigue 25 000 puntos en una partida.',
    category: 'skill',
    target: 25000,
    progress: (c) => c.profile.bestScore,
  },
  {
    id: 'score-50k',
    name: 'Élite Orbital',
    description: 'Consigue 50 000 puntos en una partida.',
    category: 'skill',
    target: 50000,
    progress: (c) => c.profile.bestScore,
  },
  {
    id: 'perfects-100',
    name: 'Cien Ventanas',
    description: 'Acumula 100 capturas perfectas.',
    category: 'skill',
    target: 100,
    progress: (c) => c.profile.totalPerfectCaptures,
  },
  {
    id: 'near-miss-50',
    name: 'Al Filo',
    description: 'Pasa cerca de 50 obstáculos sin chocar.',
    category: 'skill',
    target: 50,
    progress: (c) => c.profile.nearMissTotal,
  },
  {
    id: 'fragments-500',
    name: 'Recolector',
    description: 'Recoge 500 fragmentos de energía en total.',
    category: 'collection',
    target: 500,
    progress: (c) => c.profile.totalFragments,
  },
  {
    id: 'daily-first',
    name: 'Desafío Aceptado',
    description: 'Completa un reto diario.',
    category: 'dedication',
    target: 1,
    progress: (c) => c.profile.challengesCompleted,
  },
  {
    id: 'daily-7',
    name: 'Constancia',
    description: 'Completa 7 retos diarios.',
    category: 'dedication',
    target: 7,
    progress: (c) => c.profile.challengesCompleted,
  },
  {
    id: 'days-5',
    name: 'Habitual',
    description: 'Juega en 5 días distintos.',
    category: 'dedication',
    target: 5,
    progress: (c) => c.profile.daysPlayed.length,
  },
  {
    id: 'first-skin',
    name: 'Nuevo Aspecto',
    description: 'Desbloquea una apariencia adicional.',
    category: 'collection',
    target: 2,
    progress: (c) => c.profile.unlockedSkins.length,
  },
  {
    id: 'runs-50',
    name: 'Veterano',
    description: 'Juega 50 partidas.',
    category: 'dedication',
    target: 50,
    progress: (c) => c.profile.totalRuns,
  },
  {
    id: 'distance-100k',
    name: 'Cien Mil Unidades',
    description: 'Recorre 100 000 unidades de distancia acumulada.',
    category: 'endurance',
    target: 100000,
    progress: (c) => c.profile.totalDistance,
  },
];

export function findAchievement(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}

export interface AchievementState {
  definition: AchievementDefinition;
  progress: number;
  unlocked: boolean;
  ratio: number;
}

/** Evaluates every achievement against a context and stored progress. */
export function evaluateAchievements(
  context: AchievementContext,
  stored: Record<string, number>,
): AchievementState[] {
  return ACHIEVEMENTS.map((definition) => {
    // Progress is monotonic: never let a weak run reduce a stored best.
    const computed = Math.max(0, definition.progress(context));
    const progress = Math.max(stored[definition.id] ?? 0, computed);
    const clamped = Math.min(progress, definition.target);
    return {
      definition,
      progress: clamped,
      unlocked: clamped >= definition.target,
      ratio: definition.target === 0 ? 1 : clamped / definition.target,
    };
  });
}

/** Achievements that became unlocked with this evaluation. */
export function newlyUnlocked(
  states: readonly AchievementState[],
  stored: Record<string, number>,
): AchievementDefinition[] {
  return states
    .filter((state) => {
      const previous = stored[state.definition.id] ?? 0;
      return state.unlocked && previous < state.definition.target;
    })
    .map((state) => state.definition);
}
