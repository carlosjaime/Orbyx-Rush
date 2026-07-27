'use client';

import { useEffect } from 'react';
import { useUiStore } from '@/stores/useUiStore';

/**
 * Registers the service worker and surfaces updates.
 *
 * Update strategy: a new worker installs in the background and waits. We only
 * tell the player a new version is ready — we never reload mid-run. The swap
 * happens when they choose it, from the update toast.
 */
export function useServiceWorker(): void {
  const setUpdateAvailable = useUiStore((state) => state.setUpdateAvailable);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // A native shell serves from the bundle; a SW would only add a stale layer.
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') return;
    if (process.env.NODE_ENV !== 'production') return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (cancelled) return;

        if (registration.waiting) setUpdateAvailable(true);

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      } catch (error) {
        console.warn('[PWA] service worker registration failed', error);
      }
    };

    void register();
    return () => {
      cancelled = true;
    };
  }, [setUpdateAvailable]);
}

/** Activates the waiting worker and reloads once it takes control. */
export async function applyServiceWorkerUpdate(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    });
    return;
  }
  window.location.reload();
}
