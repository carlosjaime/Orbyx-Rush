import { dailySeedFor } from '@/game/systems/DailyChallengeSystem';
import { GameScene } from '@/game/scenes/GameScene';
import { SCENE_KEYS } from '@/game/scenes/SceneKeys';
import type { GameMode } from '@/game/types';

/**
 * Daily challenge run.
 *
 * Identical rules to the endless mode, but the seed is pinned to the UTC day,
 * so retrying replays exactly the same track — which is the whole point.
 */
export class ChallengeScene extends GameScene {
  constructor() {
    super(SCENE_KEYS.challenge);
  }

  protected override defaultMode(): GameMode {
    return 'daily';
  }

  /** Retrying a daily must never reroll the layout. */
  protected override nextSeed(): string {
    return this.seed || dailySeedFor();
  }
}
