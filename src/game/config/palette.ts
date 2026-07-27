/**
 * Central design tokens for Orbyx Rush.
 *
 * Every colour used by Phaser, React and CSS originates here. Never inline a
 * hex code anywhere else in the project — add a token instead.
 */

export const PALETTE = {
  /** Deep blue-black used for the void behind everything. */
  void: '#04070f',
  /** Slightly lifted background for nebula bands. */
  voidSoft: '#070d1c',
  /** Dark petrol surfaces (panels, cards, HUD chips). */
  surface: '#0d1a2b',
  surfaceRaised: '#132436',
  surfaceBorder: '#1d3a52',
  /** Primary brand colour: electric cyan. */
  primary: '#22e6ff',
  primaryDim: '#0e93a8',
  /** Secondary brand colour: neon violet. */
  secondary: '#9d5cff',
  secondaryDim: '#5f30ad',
  /** Accents. */
  accentMagenta: '#ff3ea5',
  accentOrange: '#ff9d2e',
  /** Semantic. */
  success: '#43f5a5',
  danger: '#ff5470',
  warning: '#ffd166',
  /** Typography. */
  text: '#e8f4ff',
  textMuted: '#8fa6bd',
  textFaint: '#5b7086',
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Converts a `#rrggbb` string into the 0xrrggbb number Phaser expects. */
export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

/** Numeric mirror of {@link PALETTE} for Phaser graphics APIs. */
export const COLORS: Record<PaletteKey, number> = Object.fromEntries(
  Object.entries(PALETTE).map(([key, value]) => [key, hexToNumber(value)]),
) as Record<PaletteKey, number>;

/**
 * High-contrast / colour-blind friendly overrides. Hue pairs were chosen so
 * that danger and success stay distinguishable under deuteranopia, and every
 * state is additionally signalled by shape or motion in-game.
 */
export const ACCESSIBLE_PALETTE: Record<PaletteKey, string> = {
  ...PALETTE,
  primary: '#4fd1ff',
  secondary: '#ffffff',
  accentMagenta: '#ffb703',
  accentOrange: '#ffd166',
  success: '#ffffff',
  danger: '#ff8c1a',
  text: '#ffffff',
  textMuted: '#c9d8e6',
};

export const ACCESSIBLE_COLORS: Record<PaletteKey, number> = Object.fromEntries(
  Object.entries(ACCESSIBLE_PALETTE).map(([key, value]) => [key, hexToNumber(value)]),
) as Record<PaletteKey, number>;

/** Resolves the active numeric palette for the given accessibility setting. */
export function resolveColors(highContrast: boolean): Record<PaletteKey, number> {
  return highContrast ? ACCESSIBLE_COLORS : COLORS;
}

/** Resolves the active string palette for the given accessibility setting. */
export function resolvePalette(highContrast: boolean): Record<PaletteKey, string> {
  return highContrast ? { ...ACCESSIBLE_PALETTE } : { ...PALETTE };
}
