import { expect, test } from '@playwright/test';
import { PLAY_BUTTON, bootGame, readSave } from './helpers';

test.describe('Orbyx Rush — screens and settings', () => {
  test('opens every secondary screen from the main menu', async ({ page }) => {
    await bootGame(page);

    const screens: Array<[string, string]> = [
      ['Reto diario', 'Reto diario'],
      ['Apariencias', 'Apariencias'],
      ['Logros', 'Logros'],
      ['Estadísticas', 'Estadísticas'],
      ['Configuración', 'Configuración'],
      ['Créditos', 'Créditos'],
    ];

    for (const [button, dialogName] of screens) {
      await page.getByRole('button', { name: button, exact: true }).click();
      await expect(page.getByRole('dialog', { name: dialogName })).toBeVisible();
      await page.getByRole('button', { name: 'Cerrar' }).click();
      await expect(page.getByRole('dialog', { name: dialogName })).toBeHidden();
    }
  });

  test('daily challenge is seeded from the UTC date and labels demo data', async ({ page }) => {
    await bootGame(page);
    await page.getByTestId('daily-button').click();

    const today = new Date().toISOString().slice(0, 10);
    await expect(page.getByText(`ORBYX-DAILY-${today}`)).toBeVisible();
    await expect(page.getByText('Datos de demostración')).toBeVisible();
    await expect(page.getByText(/no representan a jugadores reales/)).toBeVisible();
    await expect(page.getByTestId('daily-play')).toBeVisible();
  });

  test('settings changes persist across a reload', async ({ page }) => {
    await bootGame(page);
    await page.getByTestId('settings-button').click();

    const highContrast = page.getByRole('switch', { name: 'Alto contraste' });
    await expect(highContrast).toHaveAttribute('aria-checked', 'false');
    await highContrast.click();
    await expect(highContrast).toHaveAttribute('aria-checked', 'true');

    const reducedMotion = page.getByRole('switch', { name: 'Reducir movimiento' });
    await reducedMotion.click();

    // The setting must reach the DOM immediately, not only after a restart.
    await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true');

    await page.reload();
    await expect(page.locator(PLAY_BUTTON)).toBeEnabled({ timeout: 30_000 });

    const save = await readSave(page);
    const settings = save?.settings as
      { highContrast: boolean; reducedMotion: boolean } | undefined;
    expect(settings?.highContrast).toBe(true);
    expect(settings?.reducedMotion).toBe(true);

    await page.getByTestId('settings-button').click();
    await expect(page.getByRole('switch', { name: 'Alto contraste' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('volume sliders persist and the mute switch works', async ({ page }) => {
    await bootGame(page);
    await page.getByTestId('settings-button').click();

    await page.getByLabel('Música').fill('40');
    await page.getByRole('switch', { name: 'Silenciar todo' }).click();

    await page.reload();
    await expect(page.locator(PLAY_BUTTON)).toBeEnabled({ timeout: 30_000 });

    const save = await readSave(page);
    const settings = save?.settings as { musicVolume: number; muted: boolean } | undefined;
    expect(settings?.musicVolume).toBeCloseTo(0.4, 2);
    expect(settings?.muted).toBe(true);
  });

  test('resetting progress asks for confirmation and clears the save', async ({ page }) => {
    // Seed the save *before* any app code runs. Writing it after boot would be
    // overwritten by the app's own flush, which caches the save in memory.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'orbyx-rush:save',
        JSON.stringify({
          version: 3,
          updatedAt: Date.now(),
          settings: {},
          profile: { bestScore: 12345, totalRuns: 9, fragments: 300 },
          daily: [],
        }),
      );
    });

    await bootGame(page);
    // A pre-existing record must be loaded, migrated and displayed.
    await expect(page.getByText('12.345')).toBeVisible();

    await page.getByTestId('settings-button').click();
    await page.getByRole('button', { name: 'Restablecer progreso' }).click();
    await expect(page.getByRole('dialog', { name: 'Restablecer progreso' })).toBeVisible();
    await expect(page.getByText('Esta acción no se puede deshacer.')).toBeVisible();

    await page.getByRole('button', { name: 'Sí, borrar todo' }).click();

    const save = await readSave(page);
    const profile = save?.profile as { bestScore: number } | undefined;
    expect(profile?.bestScore).toBe(0);
  });

  test('achievements screen lists the full declarative catalogue', async ({ page }) => {
    await bootGame(page);
    await page.getByRole('button', { name: 'Logros', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Logros' });
    await expect(dialog.getByText('Primera Órbita')).toBeVisible();
    await expect(dialog.getByText('Cadena Perfecta')).toBeVisible();
    await expect(page.getByText(/de \d+ desbloqueados/)).toBeVisible();
    expect(await dialog.getByRole('progressbar').count()).toBeGreaterThanOrEqual(15);
  });

  test('skins screen shows locked cosmetics with their unlock requirement', async ({ page }) => {
    await bootGame(page);
    await page.getByTestId('skins-button').click();

    const dialog = page.getByRole('dialog', { name: 'Apariencias' });
    await expect(dialog.getByText('Pulso Cian')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Equipado' })).toBeVisible();
    await expect(dialog.getByText('Nivel 3')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Bloqueado' }).first()).toBeVisible();
    await expect(dialog.getByText(/No hay compras ni cajas de recompensa/)).toBeVisible();
  });

  test('privacy screen states that data stays on the device', async ({ page }) => {
    await bootGame(page);
    await page.getByTestId('settings-button').click();
    await page.getByRole('button', { name: 'Privacidad' }).click();

    const dialog = page.getByRole('dialog', { name: 'Privacidad' });
    await expect(dialog.getByText(/solo en tu dispositivo/)).toBeVisible();
    await expect(dialog.getByText(/Qué NO se recoge/)).toBeVisible();
  });
});

test.describe('Orbyx Rush — static routes', () => {
  test('offline page renders its fallback content', async ({ page }) => {
    await page.goto('/offline/');
    await expect(page.getByRole('heading', { name: 'Sin conexión' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reintentar' })).toBeVisible();
  });

  test('privacy route renders the full policy', async ({ page }) => {
    await page.goto('/privacy/');
    await expect(page.getByRole('heading', { name: 'Política de privacidad' })).toBeVisible();
    await expect(page.getByText(/no recoge datos personales|No recogemos nombre/)).toBeVisible();
  });

  test('404 page renders for an unknown route', async ({ page }) => {
    const response = await page.goto('/esta-ruta-no-existe/');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('404')).toBeVisible();
  });

  test('serves an installable web manifest', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest');
    expect(response?.ok()).toBe(true);
    const manifest = JSON.parse((await response?.text()) ?? '{}');
    expect(manifest.name).toBe('Orbyx Rush');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
