import type { GameMode, GameSettings, RunResult, RunStats } from '@/game/types';

/**
 * The single, fully typed contract between the Phaser world and the React UI.
 *
 * React never imports Phaser classes and Phaser never imports React components:
 * everything crosses this bus. That keeps the engine testable in isolation and
 * prevents accidental re-render storms during the game loop.
 */
export interface GameEventMap {
  GAME_READY: { ready: true };
  PRELOAD_PROGRESS: { progress: number };
  RUN_STARTED: { mode: GameMode; seed: string };
  RUN_PAUSED: { reason: 'user' | 'blur' | 'system' };
  RUN_RESUMED: undefined;
  RUN_FINISHED: RunResult;
  /** Carries the final stats so React never has to guess from the last tick. */
  PLAYER_DIED: {
    cause: DeathCause;
    canRevive: boolean;
    stats: RunStats;
    mode: GameMode;
    seed: string;
  };
  HUD_TICK: RunStats;
  SCORE_CHANGED: { score: number; delta: number };
  COMBO_CHANGED: { combo: number; multiplier: number; tier: number };
  HIGH_SCORE_CHANGED: { score: number; previous: number };
  FRAGMENT_COLLECTED: { total: number };
  SHIELD_CHANGED: { active: boolean };
  REWARD_GRANTED: { kind: 'skin' | 'trail' | 'theme' | 'achievement'; id: string; label: string };
  TUTORIAL_STEP: { step: number; total: number; hint: string };
  TUTORIAL_COMPLETED: undefined;
  SETTINGS_CHANGED: GameSettings;
  OPEN_MENU: { screen: MenuScreen };
  CLOSE_MENU: undefined;
  REQUEST_START_RUN: { mode: GameMode; seed?: string };
  REQUEST_RESTART: undefined;
  REQUEST_PAUSE: undefined;
  REQUEST_RESUME: undefined;
  REQUEST_QUIT_TO_MENU: undefined;
  REQUEST_REVIVE: undefined;
  DEBUG_COMMAND: { command: DebugCommand; value?: number | string | boolean };
  PERFORMANCE_SAMPLE: { fps: number; degraded: boolean };
}

export type DeathCause = 'void' | 'obstacle' | 'laser' | 'missed-core' | 'out-of-bounds';

export type MenuScreen =
  | 'main'
  | 'skins'
  | 'daily'
  | 'achievements'
  | 'stats'
  | 'settings'
  | 'credits'
  | 'privacy'
  | 'reset-confirm'
  | 'summary'
  | 'tutorial';

export type DebugCommand =
  | 'toggle-fps'
  | 'toggle-hitboxes'
  | 'toggle-gravity-radius'
  | 'toggle-trajectory'
  | 'toggle-invincible'
  | 'set-time-scale'
  | 'spawn-obstacle'
  | 'add-score'
  | 'force-game-over'
  | 'set-seed'
  | 'set-particles'
  | 'simulate-slow-device'
  | 'clear-storage';

export type GameEventName = keyof GameEventMap;

type Handler<K extends GameEventName> = (payload: GameEventMap[K]) => void;

/**
 * Minimal typed emitter. Deliberately dependency-free and synchronous so a
 * Phaser frame can notify React without an extra micro-task hop.
 */
export class TypedEventBus {
  private readonly handlers = new Map<GameEventName, Set<Handler<GameEventName>>>();

  on<K extends GameEventName>(event: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<GameEventName>);
    return () => this.off(event, handler);
  }

  once<K extends GameEventName>(event: K, handler: Handler<K>): () => void {
    const dispose = this.on(event, ((payload: GameEventMap[K]) => {
      dispose();
      handler(payload);
    }) as Handler<K>);
    return dispose;
  }

  off<K extends GameEventName>(event: K, handler: Handler<K>): void {
    this.handlers.get(event)?.delete(handler as Handler<GameEventName>);
  }

  emit<K extends GameEventName>(
    event: K,
    ...args: GameEventMap[K] extends undefined ? [] : [GameEventMap[K]]
  ): void {
    const set = this.handlers.get(event);
    if (!set || set.size === 0) return;
    const payload = args[0] as GameEventMap[GameEventName];
    // Copy so a handler that unsubscribes mid-dispatch cannot corrupt iteration.
    for (const handler of Array.from(set)) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[GameBus] handler for "${String(event)}" threw`, error);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Process-wide singleton. Created lazily so importing this module during SSR is
 * harmless (it touches no browser API).
 */
export const gameBus = new TypedEventBus();
