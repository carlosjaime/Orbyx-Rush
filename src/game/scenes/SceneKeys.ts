export const SCENE_KEYS = {
  boot: 'BootScene',
  preload: 'PreloadScene',
  menu: 'MenuScene',
  tutorial: 'TutorialScene',
  game: 'GameScene',
  challenge: 'ChallengeScene',
  gameOver: 'GameOverScene',
  ui: 'UIScene',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];

/** Registry keys shared between scenes through `game.registry`. */
export const REGISTRY_KEYS = {
  settings: 'settings',
  capabilities: 'capabilities',
  cosmetics: 'cosmetics',
  bestScore: 'bestScore',
} as const;
