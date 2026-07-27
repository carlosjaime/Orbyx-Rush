import { PALETTE } from '@/game/config/palette';
import type { PlayerProfile } from '@/game/types';

/**
 * Cosmetic catalogue.
 *
 * Everything here is purely visual — no cosmetic grants a gameplay advantage,
 * and none of them is behind a paywall or a random draw in this release.
 */

export type CosmeticCategory = 'skin' | 'trail' | 'theme';

export interface UnlockRule {
  kind: 'default' | 'level' | 'score' | 'combo' | 'perfects' | 'challenges' | 'achievement';
  /** Threshold for the numeric rules, achievement id for `achievement`. */
  value?: number;
  achievementId?: string;
  /** Human readable, shown in the skins screen. */
  label: string;
}

export interface CosmeticDefinition {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  /** Primary + secondary colour used to render the preview and the entity. */
  colors: readonly [string, string];
  unlock: UnlockRule;
}

export const SKINS: readonly CosmeticDefinition[] = [
  {
    id: 'cyan-pulse',
    category: 'skin',
    name: 'Pulso Cian',
    description: 'El núcleo estándar de Orbyx. Estable, brillante, confiable.',
    colors: [PALETTE.primary, PALETTE.primaryDim],
    unlock: { kind: 'default', label: 'Disponible desde el inicio' },
  },
  {
    id: 'violet-drift',
    category: 'skin',
    name: 'Deriva Violeta',
    description: 'Plasma de baja frecuencia. Deja una huella más densa.',
    colors: [PALETTE.secondary, PALETTE.secondaryDim],
    unlock: { kind: 'level', value: 3, label: 'Nivel 3' },
  },
  {
    id: 'magenta-flux',
    category: 'skin',
    name: 'Flujo Magenta',
    description: 'Inestable a simple vista, perfectamente equilibrado.',
    colors: [PALETTE.accentMagenta, PALETTE.secondary],
    unlock: { kind: 'score', value: 15000, label: '15 000 puntos en una partida' },
  },
  {
    id: 'solar-ember',
    category: 'skin',
    name: 'Brasa Solar',
    description: 'Recuperada del borde de una enana naranja.',
    colors: [PALETTE.accentOrange, PALETTE.warning],
    unlock: { kind: 'combo', value: 25, label: 'Combo de 25' },
  },
  {
    id: 'quantum-mint',
    category: 'skin',
    name: 'Menta Cuántica',
    description: 'Solo existe cuando nadie la observa.',
    colors: [PALETTE.success, PALETTE.primary],
    unlock: { kind: 'perfects', value: 150, label: '150 capturas perfectas' },
  },
  {
    id: 'null-core',
    category: 'skin',
    name: 'Núcleo Nulo',
    description: 'Absorbe la luz que la rodea. Reservada a los constantes.',
    colors: [PALETTE.textMuted, PALETTE.surfaceBorder],
    unlock: { kind: 'challenges', value: 10, label: '10 retos diarios completados' },
  },
];

export const TRAILS: readonly CosmeticDefinition[] = [
  {
    id: 'plasma',
    category: 'trail',
    name: 'Plasma',
    description: 'Estela corta y limpia.',
    colors: [PALETTE.primary, PALETTE.secondary],
    unlock: { kind: 'default', label: 'Disponible desde el inicio' },
  },
  {
    id: 'comet',
    category: 'trail',
    name: 'Cometa',
    description: 'Estela larga con dispersión de partículas.',
    colors: [PALETTE.warning, PALETTE.accentOrange],
    unlock: { kind: 'level', value: 6, label: 'Nivel 6' },
  },
  {
    id: 'ion-thread',
    category: 'trail',
    name: 'Hilo de Iones',
    description: 'Filamento fino de altísima energía.',
    colors: [PALETTE.success, PALETTE.primary],
    unlock: {
      kind: 'achievement',
      achievementId: 'perfect-chain-10',
      label: 'Logro: Cadena Perfecta',
    },
  },
  {
    id: 'void-echo',
    category: 'trail',
    name: 'Eco del Vacío',
    description: 'Repite tu trayectoria un instante después.',
    colors: [PALETTE.secondary, PALETTE.accentMagenta],
    unlock: { kind: 'score', value: 40000, label: '40 000 puntos en una partida' },
  },
];

export const THEMES: readonly CosmeticDefinition[] = [
  {
    id: 'deep-void',
    category: 'theme',
    name: 'Vacío Profundo',
    description: 'Nebulosas frías sobre negro azulado.',
    colors: [PALETTE.void, PALETTE.primary],
    unlock: { kind: 'default', label: 'Disponible desde el inicio' },
  },
  {
    id: 'violet-nebula',
    category: 'theme',
    name: 'Nebulosa Violeta',
    description: 'Bandas de polvo cargado a media distancia.',
    colors: [PALETTE.voidSoft, PALETTE.secondary],
    unlock: { kind: 'level', value: 9, label: 'Nivel 9' },
  },
  {
    id: 'ember-belt',
    category: 'theme',
    name: 'Cinturón de Brasas',
    description: 'Restos incandescentes de un sistema colapsado.',
    colors: [PALETTE.void, PALETTE.accentOrange],
    unlock: { kind: 'achievement', achievementId: 'survive-120', label: 'Logro: Resistencia' },
  },
];

export const ALL_COSMETICS: readonly CosmeticDefinition[] = [...SKINS, ...TRAILS, ...THEMES];

export function findCosmetic(id: string): CosmeticDefinition | undefined {
  return ALL_COSMETICS.find((item) => item.id === id);
}

/** Snapshot of the numbers an unlock rule can be evaluated against. */
export interface UnlockContext {
  level: number;
  bestScore: number;
  maxCombo: number;
  totalPerfectCaptures: number;
  challengesCompleted: number;
  achievements: Record<string, number>;
}

export function unlockContextFromProfile(profile: PlayerProfile): UnlockContext {
  return {
    level: profile.level,
    bestScore: profile.bestScore,
    maxCombo: profile.maxCombo,
    totalPerfectCaptures: profile.totalPerfectCaptures,
    challengesCompleted: profile.challengesCompleted,
    achievements: profile.achievements,
  };
}

/** Evaluates a single unlock rule. */
export function isUnlocked(rule: UnlockRule, context: UnlockContext): boolean {
  switch (rule.kind) {
    case 'default':
      return true;
    case 'level':
      return context.level >= (rule.value ?? 0);
    case 'score':
      return context.bestScore >= (rule.value ?? 0);
    case 'combo':
      return context.maxCombo >= (rule.value ?? 0);
    case 'perfects':
      return context.totalPerfectCaptures >= (rule.value ?? 0);
    case 'challenges':
      return context.challengesCompleted >= (rule.value ?? 0);
    case 'achievement':
      return Boolean(rule.achievementId && context.achievements[rule.achievementId]);
    default:
      return false;
  }
}

/** Returns every cosmetic id newly satisfied by the given context. */
export function evaluateCosmeticUnlocks(
  context: UnlockContext,
  alreadyUnlocked: readonly string[],
): CosmeticDefinition[] {
  const owned = new Set(alreadyUnlocked);
  return ALL_COSMETICS.filter((item) => !owned.has(item.id) && isUnlocked(item.unlock, context));
}
