import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3210);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/**
 * Some CI images ship a preinstalled Chromium that does not match the revision
 * this Playwright version would download. Reuse it when present instead of
 * failing (or pulling a second browser down).
 */
const PREINSTALLED_CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const launchOptions = {
  ...(existsSync(PREINSTALLED_CHROMIUM) ? { executablePath: PREINSTALLED_CHROMIUM } : {}),
  // Headless Chromium renders WebGL through SwiftShader and caps rAF to the
  // vsync it thinks it has. These flags let the loop run as fast as the
  // software rasteriser allows, which keeps timing-dependent specs sane.
  args: ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--disable-dev-shm-usage'],
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // Screencast recording forces a per-frame GPU ReadPixels, which throttles a
    // WebGL canvas to a few FPS under software rendering. Only record retries.
    video: 'on-first-retry',
    launchOptions,
  },
  projects: [
    {
      name: 'mobile-portrait',
      use: { ...devices['Pixel 7'], hasTouch: true, isMobile: true, launchOptions },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
        launchOptions,
      },
    },
  ],
  webServer: {
    // No `-s`: the export is a real multi-route static site, not an SPA, and
    // rewriting everything to index.html would hide 404s and the offline page.
    command: `npx serve out -l ${PORT} --no-clipboard`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
  },
});
