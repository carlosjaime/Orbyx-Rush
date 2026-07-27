import type * as Phaser from 'phaser';
import { PALETTE, hexToNumber } from '@/game/config/palette';
import { SKINS, THEMES, TRAILS, findCosmetic } from '@/game/config/cosmetics';
import { REGISTRY_KEYS } from '@/game/scenes/SceneKeys';

/** The cosmetic selection the React shell pushes into the Phaser registry. */
export interface EquippedCosmetics {
  skinId: string;
  trailId: string;
  themeId: string;
}

export const DEFAULT_EQUIPPED: EquippedCosmetics = {
  skinId: SKINS[0]!.id,
  trailId: TRAILS[0]!.id,
  themeId: THEMES[0]!.id,
};

export interface ResolvedCosmetics {
  orbPrimary: string;
  orbPrimaryNumeric: number;
  trail: string;
  trailNumeric: number;
  theme: readonly [string, string];
}

/** Resolves the equipped ids into concrete colours, with safe fallbacks. */
export function resolveCosmetics(equipped: EquippedCosmetics): ResolvedCosmetics {
  const skin = findCosmetic(equipped.skinId) ?? SKINS[0]!;
  const trail = findCosmetic(equipped.trailId) ?? TRAILS[0]!;
  const theme = findCosmetic(equipped.themeId) ?? THEMES[0]!;

  const orbPrimary = skin.colors[0] ?? PALETTE.primary;
  const trailColor = trail.colors[0] ?? PALETTE.primary;

  return {
    orbPrimary,
    orbPrimaryNumeric: hexToNumber(orbPrimary),
    trail: trailColor,
    trailNumeric: hexToNumber(trailColor),
    theme: theme.colors,
  };
}

/** Reads the equipped cosmetics out of a Phaser registry. */
export function getEquippedColors(registry: Phaser.Data.DataManager): ResolvedCosmetics {
  const equipped =
    (registry.get(REGISTRY_KEYS.cosmetics) as EquippedCosmetics | undefined) ?? DEFAULT_EQUIPPED;
  return resolveCosmetics(equipped);
}
