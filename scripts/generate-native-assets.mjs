#!/usr/bin/env node
/**
 * Generates every native icon and splash asset from the source SVGs in
 * `public/icons/`.
 *
 * Run it after changing the branding:
 *   node scripts/generate-native-assets.mjs
 *
 * Keeping this as a script (rather than committing hand-exported PNGs with no
 * provenance) means the whole icon set is reproducible from vector sources.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = path.resolve(import.meta.dirname, '..');
const ICON_SVG = path.join(ROOT, 'public/icons/icon.svg');
const MASKABLE_SVG = path.join(ROOT, 'public/icons/icon-maskable.svg');
const SPLASH_SVG = path.join(ROOT, 'public/icons/splash.svg');

const BACKGROUND = { r: 4, g: 7, b: 15, alpha: 1 };

async function render(source, width, height, target, options = {}) {
  await mkdir(path.dirname(target), { recursive: true });
  const buffer = await readFile(source);
  let pipeline = sharp(buffer, { density: 500 }).resize(width, height, {
    fit: options.fit ?? 'contain',
    background: options.background ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (options.flatten) pipeline = pipeline.flatten({ background: BACKGROUND });
  await pipeline.png().toFile(target);
}

// --------------------------------------------------------------------- web ---

async function generateWeb() {
  const out = path.join(ROOT, 'public/icons');
  await render(ICON_SVG, 192, 192, path.join(out, 'icon-192.png'));
  await render(ICON_SVG, 512, 512, path.join(out, 'icon-512.png'));
  await render(MASKABLE_SVG, 512, 512, path.join(out, 'icon-maskable-512.png'));
  await render(ICON_SVG, 180, 180, path.join(out, 'apple-touch-icon.png'));
  await render(ICON_SVG, 1024, 1024, path.join(out, 'store-icon-1024.png'));

  // favicon.ico: a 48x48 PNG inside a minimal single-image ICO container.
  const png = await sharp(await readFile(ICON_SVG), { density: 500 })
    .resize(48, 48)
    .png()
    .toBuffer();
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(48, 0);
  entry.writeUInt8(48, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  await writeFile(path.join(ROOT, 'public/favicon.ico'), Buffer.concat([header, entry, png]));
}

// ----------------------------------------------------------------- android ---

/** Launcher icon sizes per density bucket. */
const ANDROID_LAUNCHER = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

/** Adaptive-icon foreground is 108dp with the outer 18dp reserved for masking. */
const ANDROID_FOREGROUND = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

/** Portrait / landscape splash sizes per density bucket. */
const ANDROID_SPLASH = {
  mdpi: [320, 480],
  hdpi: [480, 800],
  xhdpi: [720, 1280],
  xxhdpi: [960, 1600],
  xxxhdpi: [1280, 1920],
};

async function generateAndroid() {
  const res = path.join(ROOT, 'android/app/src/main/res');
  if (!existsSync(res)) {
    console.warn('[assets] android platform not present, skipping');
    return;
  }

  for (const [density, size] of Object.entries(ANDROID_LAUNCHER)) {
    const dir = path.join(res, `mipmap-${density}`);
    await render(ICON_SVG, size, size, path.join(dir, 'ic_launcher.png'), { flatten: true });
    await render(ICON_SVG, size, size, path.join(dir, 'ic_launcher_round.png'), { flatten: true });
  }

  for (const [density, size] of Object.entries(ANDROID_FOREGROUND)) {
    const dir = path.join(res, `mipmap-${density}`);
    await render(MASKABLE_SVG, size, size, path.join(dir, 'ic_launcher_foreground.png'));
  }

  for (const [density, [width, height]] of Object.entries(ANDROID_SPLASH)) {
    await render(SPLASH_SVG, width, height, path.join(res, `drawable-port-${density}/splash.png`), {
      fit: 'cover',
      flatten: true,
    });
    await render(SPLASH_SVG, height, width, path.join(res, `drawable-land-${density}/splash.png`), {
      fit: 'cover',
      flatten: true,
    });
  }

  await render(SPLASH_SVG, 480, 800, path.join(res, 'drawable/splash.png'), {
    fit: 'cover',
    flatten: true,
  });
}

// --------------------------------------------------------------------- ios ---

async function generateIos() {
  const assets = path.join(ROOT, 'ios/App/App/Assets.xcassets');
  if (!existsSync(assets)) {
    console.warn('[assets] ios platform not present, skipping');
    return;
  }

  // Xcode 14+ accepts a single 1024x1024 marketing icon for every slot.
  await render(ICON_SVG, 1024, 1024, path.join(assets, 'AppIcon.appiconset/AppIcon-512@2x.png'), {
    flatten: true,
  });

  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await render(SPLASH_SVG, 2732, 2732, path.join(assets, `Splash.imageset/${name}`), {
      fit: 'cover',
      flatten: true,
    });
  }
}

await generateWeb();
await generateAndroid();
await generateIos();
console.info('[assets] native icons and splash screens regenerated');
