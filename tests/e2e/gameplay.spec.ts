import { expect, test } from '@playwright/test';
import {
  CANVAS,
  PLAY_BUTTON,
  RESUME_BUTTON,
  RETRY_BUTTON,
  bootGame,
  forceGameOver,
  markPage,
  pageWasReloaded,
  readSave,
  startRun,
  tapCanvas,
} from './helpers';

test.describe('Orbyx Rush — core flow', () => {
  test('boots into the main menu with the engine ready', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await bootGame(page);

    await expect(page.getByText('ORBYX', { exact: true })).toBeVisible();
    await expect(page.getByText('Récord')).toBeVisible();
    await expect(page.getByText(/Nivel 1/)).toBeVisible();
    await expect(page.getByText(/RCMX/).first()).toBeVisible();

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });

  test('runs the interactive tutorial and can skip it', async ({ page }) => {
    await bootGame(page);
    await page.locator(PLAY_BUTTON).click();

    // First-time players are routed into the tutorial automatically.
    await expect(page.getByText(/Paso 1 de/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/gira sola alrededor del núcleo/)).toBeVisible();

    // Step 1 completes by simply watching the orbit — no input required. The
    // budget is generous because a headless software renderer advances game
    // time far slower than real hardware.
    await expect(page.getByText(/Paso 2 de/)).toBeVisible({ timeout: 60_000 });

    await page.getByRole('button', { name: 'Saltar tutorial' }).click();
    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible({ timeout: 15_000 });
  });

  test('plays a run: the orb launches and the score grows', async ({ page }) => {
    await bootGame(page);
    await startRun(page);

    const scoreLocator = page.locator('main p.tabular-nums').first();
    await expect(scoreLocator).toBeVisible();

    await tapCanvas(page, 4);
    await page.waitForTimeout(4000);

    // The survival stipend alone guarantees a non-zero score in a live run.
    const score = await scoreLocator.textContent();
    expect(Number((score ?? '0').replace(/\D/g, ''))).toBeGreaterThan(0);
  });

  test('pauses with the HUD button and with Escape, then resumes', async ({ page }) => {
    await bootGame(page);
    await startRun(page);

    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(page.getByRole('dialog', { name: 'Juego en pausa' })).toBeVisible();

    await page.locator(RESUME_BUTTON).click();
    await expect(page.getByRole('dialog', { name: 'Juego en pausa' })).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Juego en pausa' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Juego en pausa' })).toBeHidden();
  });

  test('ends the run and shows the full result screen', async ({ page }) => {
    await bootGame(page);
    await startRun(page);
    await tapCanvas(page, 2);
    await forceGameOver(page);

    const dialog = page.getByRole('dialog', { name: 'Resultado de la partida' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Mejor puntuación')).toBeVisible();
    await expect(dialog.getByText('Combo máximo')).toBeVisible();
    await expect(dialog.getByText('Capturas perfectas')).toBeVisible();
    await expect(dialog.getByText('Experiencia')).toBeVisible();
    await expect(page.locator(RETRY_BUTTON)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compartir' })).toBeVisible();
  });

  test('retry restarts instantly without reloading the page', async ({ page }) => {
    await bootGame(page);
    await startRun(page);
    await forceGameOver(page);

    await markPage(page);
    await page.locator(RETRY_BUTTON).click();

    await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible({ timeout: 15_000 });
    expect(await pageWasReloaded(page)).toBe(false);
    await expect(page.locator(CANVAS)).toBeVisible();
  });

  test('returns to the menu from the result screen', async ({ page }) => {
    await bootGame(page);
    await startRun(page);
    await forceGameOver(page);

    await page.getByTestId('quit-button').click();
    await expect(page.locator(PLAY_BUTTON)).toBeVisible();
  });

  test('persists the high score across a full reload', async ({ page }) => {
    await bootGame(page);
    await startRun(page);
    await tapCanvas(page, 3);
    await page.waitForTimeout(4000);
    await forceGameOver(page);
    await page.getByTestId('quit-button').click();

    const save = await readSave(page);
    const profile = save?.profile as { bestScore: number } | undefined;
    expect(profile?.bestScore ?? 0).toBeGreaterThan(0);

    await page.reload();
    await expect(page.locator(PLAY_BUTTON)).toBeEnabled({ timeout: 30_000 });

    const reloaded = await readSave(page);
    const reloadedProfile = reloaded?.profile as { bestScore: number } | undefined;
    expect(reloadedProfile?.bestScore).toBe(profile?.bestScore);
    await expect(
      page.getByText(String(profile?.bestScore).replace(/\B(?=(\d{3})+(?!\d))/g, '.')),
    ).toBeVisible();
  });
});
