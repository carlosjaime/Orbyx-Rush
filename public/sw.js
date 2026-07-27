/* eslint-disable no-restricted-globals */
/**
 * Orbyx Rush service worker.
 *
 * Written by hand rather than generated: the caching rules here are small,
 * explicit and easy to audit, and we avoid depending on a build plugin that
 * might not track Next.js releases.
 *
 * Strategy
 *  - App shell (navigations): network-first with a cache fallback, so a fresh
 *    deploy is picked up on the next visit but a flaky network never blocks
 *    play. Falls back to /offline/ as a last resort.
 *  - Build assets (/_next/static/*): cache-first — they are content-hashed and
 *    therefore immutable.
 *  - Everything else same-origin: stale-while-revalidate.
 *  - Cross-origin: not intercepted at all.
 */

const VERSION = 'orbyx-rush-v1.0.0';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = '/offline/';

const SHELL_ASSETS = ['/', OFFLINE_URL, '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // A single missing file must not abort the whole installation.
      await Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// The page asks for the update; we never force a reload mid-run.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = (await caches.match(request)) ?? (await caches.match('/'));
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return (
      offline ??
      new Response('Sin conexión', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 504 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached ?? (await network) ?? new Response('', { status: 504 });
}
