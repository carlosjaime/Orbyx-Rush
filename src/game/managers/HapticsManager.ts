import { HAPTICS } from '@/game/config/balance';

/**
 * Haptic feedback.
 *
 * Uses Capacitor Haptics on native builds and the Vibration API on the web,
 * degrading silently when neither is available (iOS Safari, desktop).
 */

export type HapticEvent = keyof typeof HAPTICS;

type ImpactStyle = 'Light' | 'Medium' | 'Heavy';

interface CapacitorHapticsLike {
  impact(options: { style: ImpactStyle }): Promise<void>;
  vibrate(options: { duration: number }): Promise<void>;
}

const IMPACT_STYLE: Record<HapticEvent, ImpactStyle> = {
  capture: 'Light',
  perfect: 'Medium',
  fragment: 'Light',
  impact: 'Heavy',
  record: 'Medium',
  uiTap: 'Light',
};

export class HapticsManager {
  private enabled = true;
  private nativePlugin: CapacitorHapticsLike | null = null;
  private nativeChecked = false;
  /** Rate limit so a fast combo cannot buzz the device continuously. */
  private lastFireAt = 0;
  private readonly minIntervalMs = 40;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Loads the Capacitor plugin lazily; safe to call on the web. */
  private async ensureNative(): Promise<void> {
    if (this.nativeChecked) return;
    this.nativeChecked = true;
    if (typeof window === 'undefined') return;
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      const haptics = await import('@capacitor/haptics');
      this.nativePlugin = haptics.Haptics as unknown as CapacitorHapticsLike;
    } catch {
      this.nativePlugin = null;
    }
  }

  fire(event: HapticEvent): void {
    if (!this.enabled) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastFireAt < this.minIntervalMs) return;
    this.lastFireAt = now;
    void this.dispatch(event);
  }

  private async dispatch(event: HapticEvent): Promise<void> {
    await this.ensureNative();
    const duration = HAPTICS[event];

    if (this.nativePlugin) {
      try {
        // Short taps map better to the OS impact generators than raw durations.
        if (duration <= 30) {
          await this.nativePlugin.impact({ style: IMPACT_STYLE[event] });
        } else {
          await this.nativePlugin.vibrate({ duration });
        }
        return;
      } catch {
        /* fall through to the web API */
      }
    }

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(duration);
      }
    } catch {
      /* Vibration blocked by the platform — nothing to recover from */
    }
  }
}

let singleton: HapticsManager | null = null;

export function getHapticsManager(): HapticsManager {
  if (!singleton) singleton = new HapticsManager();
  return singleton;
}
