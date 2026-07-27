import { expect, type Page } from '@playwright/test';

/**
 * Shared helpers for the end-to-end suite.
 *
 * The E2E bundle is built by `pnpm build:e2e`, which sets
 * `NEXT_PUBLIC_ENABLE_DEBUG=true` and a fixed `NEXT_PUBLIC_FORCED_SEED`, giving
 * every run an identical, reproducible track and a way to end a run on demand.
 */

export const PLAY_BUTTON = '[data-testid="play-button"]';
export const RETRY_BUTTON = '[data-testid="retry-button"]';
export const RESUME_BUTTON = '[data-testid="resume-button"]';
export const CANVAS = '[data-testid="game-canvas"] canvas';

/** Loads the game and waits until the engine reports it is ready. */
export async function bootGame(page: Page): Promise<void> {
  await page.goto('/');
  // "Jugar" is disabled until GAME_READY fires, so this asserts the boot chain.
  await expect(page.locator(PLAY_BUTTON)).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator(CANVAS)).toBeVisible();
}

/** Clicks Play and lands in a live endless run, skipping the tutorial if shown. */
export async function startRun(page: Page): Promise<void> {
  await page.locator(PLAY_BUTTON).click();

  const skip = page.getByRole('button', { name: 'Saltar tutorial' });
  if (await skip.isVisible({ timeout: 4000 }).catch(() => false)) {
    await skip.click();
  }

  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible({ timeout: 15_000 });
}

/** Opens the development debug panel. */
export async function openDebugPanel(page: Page): Promise<void> {
  const opener = page.getByRole('button', { name: /DEBUG/ });
  if (await opener.isVisible().catch(() => false)) await opener.click();
  await expect(page.getByRole('button', { name: 'Game over' })).toBeVisible();
}

/**
 * Ends the current run deterministically through the debug panel, then closes
 * the panel again — on a phone viewport it would otherwise sit on top of the
 * result screen's buttons.
 */
export async function forceGameOver(page: Page): Promise<void> {
  await openDebugPanel(page);
  await page.getByRole('button', { name: 'Game over' }).click();
  await page.getByRole('button', { name: 'Cerrar panel de depuración' }).click();
  await expect(page.locator(RETRY_BUTTON)).toBeVisible({ timeout: 15_000 });
}

/** Taps the canvas to release the orb. Works for both mouse and touch. */
export async function tapCanvas(page: Page, times = 1): Promise<void> {
  const canvas = page.locator(CANVAS);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  for (let i = 0; i < times; i += 1) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.35);
    await page.waitForTimeout(120);
  }
}

/** Marks the current document so a full page reload can be detected. */
export async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).__orbyxReloadProbe = true;
  });
}

export async function pageWasReloaded(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as unknown as Record<string, unknown>).__orbyxReloadProbe !== true,
  );
}

/** Reads the persisted save straight out of localStorage. */
export async function readSave(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('orbyx-rush:save');
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  });
}
