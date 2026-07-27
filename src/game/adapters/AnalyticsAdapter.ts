/**
 * Analytics contract.
 *
 * v1.0.0 ships with the no-op implementation wired in: nothing leaves the
 * device, no identifiers are generated and no cookies are set. The interface
 * exists so a provider can be added later without touching gameplay code.
 */

export type AnalyticsEvent =
  | { name: 'game_started' }
  | { name: 'tutorial_started' }
  | { name: 'tutorial_completed' }
  | { name: 'run_started'; mode: string }
  | { name: 'run_finished'; score: number; durationSeconds: number; coresReached: number }
  | { name: 'high_score_reached'; score: number }
  | { name: 'daily_challenge_started'; date: string }
  | { name: 'daily_challenge_completed'; date: string; score: number }
  | { name: 'skin_unlocked'; id: string }
  | { name: 'achievement_unlocked'; id: string }
  | { name: 'settings_changed'; key: string }
  | { name: 'share_result'; method: 'web-share' | 'clipboard' };

export interface AnalyticsAdapter {
  readonly id: string;
  track(event: AnalyticsEvent): void;
}

/** Default adapter: collects nothing, sends nothing. */
export class NoopAnalyticsAdapter implements AnalyticsAdapter {
  readonly id = 'noop';
  track(): void {
    /* intentionally empty */
  }
}

/** Development helper. Never selected in a production build by default. */
export class ConsoleAnalyticsAdapter implements AnalyticsAdapter {
  readonly id = 'console';
  track(event: AnalyticsEvent): void {
    console.info('[analytics]', event.name, event);
  }
}

let adapter: AnalyticsAdapter = new NoopAnalyticsAdapter();

export function setAnalyticsAdapter(next: AnalyticsAdapter): void {
  adapter = next;
}

export function getAnalyticsAdapter(): AnalyticsAdapter {
  return adapter;
}

export function trackEvent(event: AnalyticsEvent): void {
  adapter.track(event);
}

/** Resolves the adapter named by `NEXT_PUBLIC_ANALYTICS_PROVIDER`. */
export function createConfiguredAdapter(provider: string | undefined): AnalyticsAdapter {
  return provider === 'console' ? new ConsoleAnalyticsAdapter() : new NoopAnalyticsAdapter();
}
