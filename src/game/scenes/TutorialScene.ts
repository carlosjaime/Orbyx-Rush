import { WORLD } from '@/game/config/balance';
import { PALETTE } from '@/game/config/palette';
import { gameBus } from '@/game/events/GameEvents';
import { GameScene } from '@/game/scenes/GameScene';
import { SCENE_KEYS } from '@/game/scenes/SceneKeys';
import type { GameMode } from '@/game/types';

interface TutorialStep {
  hint: string;
  /** Satisfied by the player performing the action, not by a timer. */
  completedBy: 'orbit' | 'launch' | 'capture' | 'perfect';
}

/**
 * Interactive tutorial.
 *
 * Teaches by doing: each step waits for the player to actually perform the
 * action. No wall of text, no forced reading, and it can be skipped at any
 * time from the React overlay.
 */
export class TutorialScene extends GameScene {
  private static readonly STEPS: readonly TutorialStep[] = [
    {
      hint: 'Tu esfera gira sola alrededor del núcleo. Observa el sentido de giro.',
      completedBy: 'orbit',
    },
    {
      hint: 'Toca la pantalla para soltarla en la dirección de la tangente.',
      completedBy: 'launch',
    },
    { hint: 'Entra en el anillo del siguiente núcleo para engancharte.', completedBy: 'capture' },
    {
      hint: 'Suelta en el momento justo: caer sobre el anillo da CAPTURA PERFECTA.',
      completedBy: 'perfect',
    },
  ];

  private stepIndex = 0;
  private orbitObserved = false;

  constructor() {
    super(SCENE_KEYS.tutorial);
  }

  protected override defaultMode(): GameMode {
    return 'tutorial';
  }

  /** No hazards while learning: a death here teaches nothing useful. */
  protected override get peaceful(): boolean {
    return true;
  }

  protected override beginRun(): void {
    super.beginRun();
    this.stepIndex = 0;
    this.orbitObserved = false;
    this.emitStep();
  }

  private emitStep(): void {
    const step = TutorialScene.STEPS[this.stepIndex];
    if (!step) return;
    gameBus.emit('TUTORIAL_STEP', {
      step: this.stepIndex + 1,
      total: TutorialScene.STEPS.length,
      hint: step.hint,
    });
    this.textPool.spawn({
      x: WORLD.width / 2,
      y: this.cameras.main.scrollY + WORLD.height * 0.24,
      label: `PASO ${this.stepIndex + 1}/${TutorialScene.STEPS.length}`,
      color: PALETTE.primary,
      size: 34,
      life: 1.6,
      rise: 20,
    });
  }

  private advance(trigger: TutorialStep['completedBy']): void {
    const step = TutorialScene.STEPS[this.stepIndex];
    if (!step || step.completedBy !== trigger) return;

    this.stepIndex += 1;
    if (this.stepIndex >= TutorialScene.STEPS.length) {
      this.finish();
      return;
    }
    this.emitStep();
  }

  protected override onLaunched(): void {
    this.advance('launch');
  }

  protected override onCaptured(perfect: boolean): void {
    this.advance('capture');
    if (perfect) this.advance('perfect');
  }

  override update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.orbitObserved || !this.isRunning) return;
    // Step one completes once the player has watched a bit over half a lap.
    if (this.orbitSystem.revolutions >= 0.55) {
      this.orbitObserved = true;
      this.advance('orbit');
    }
  }

  private finish(): void {
    this.textPool.spawn({
      x: WORLD.width / 2,
      y: this.cameras.main.scrollY + WORLD.height * 0.3,
      label: '¡LISTO!',
      color: PALETTE.success,
      size: 56,
      life: 1.8,
    });
    gameBus.emit('TUTORIAL_COMPLETED');
  }
}
