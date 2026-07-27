import { PERFORMANCE } from '@/game/config/balance';

/**
 * Platform abstraction: everything that differs between the browser, Android
 * and iOS lives behind this interface so gameplay code never branches on the
 * user agent.
 */

export type PlatformName = 'web' | 'android' | 'ios';

export interface DeviceCapabilities {
  platform: PlatformName;
  isNative: boolean;
  isTouch: boolean;
  /** Clamped device pixel ratio actually used by the renderer. */
  pixelRatio: number;
  /** Rough graphics tier derived from cheap, non-invasive signals. */
  graphicsTier: 'low' | 'medium' | 'high';
  prefersReducedMotion: boolean;
  supportsWebGL: boolean;
  supportsVibration: boolean;
  supportsWebShare: boolean;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
}

interface NavigatorWithExtras extends Navigator {
  deviceMemory?: number;
  standalone?: boolean;
}

function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

/**
 * Estimates a graphics tier without probing the GPU (which would be both slow
 * and a fingerprinting vector). CPU cores and memory correlate well enough with
 * the mobile GPUs we care about, and the runtime FPS monitor corrects mistakes.
 */
function estimateGraphicsTier(
  cores: number,
  memoryGb: number | null,
  dpr: number,
): DeviceCapabilities['graphicsTier'] {
  const memoryScore = memoryGb === null ? 1 : memoryGb >= 6 ? 2 : memoryGb >= 3 ? 1 : 0;
  const coreScore = cores >= 8 ? 2 : cores >= 4 ? 1 : 0;
  const dprScore = dpr >= 2.5 ? 1 : 0;
  const total = memoryScore + coreScore + dprScore;
  if (total >= 4) return 'high';
  if (total >= 2) return 'medium';
  return 'low';
}

export function detectCapabilities(): DeviceCapabilities {
  if (typeof window === 'undefined') {
    return {
      platform: 'web',
      isNative: false,
      isTouch: false,
      pixelRatio: 1,
      graphicsTier: 'medium',
      prefersReducedMotion: false,
      supportsWebGL: false,
      supportsWebShare: false,
      supportsVibration: false,
      hardwareConcurrency: 4,
      deviceMemoryGb: null,
    };
  }

  const nav = navigator as NavigatorWithExtras;
  const rawDpr = window.devicePixelRatio || 1;
  const cores = nav.hardwareConcurrency ?? 4;
  const memoryGb = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const graphicsTier = estimateGraphicsTier(cores, memoryGb, rawDpr);
  const cap =
    graphicsTier === 'low' ? PERFORMANCE.lowEndDevicePixelRatio : PERFORMANCE.maxDevicePixelRatio;

  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  const isAndroid = /Android/i.test(ua);

  return {
    platform: isAndroid ? 'android' : isIos ? 'ios' : 'web',
    isNative: false,
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    pixelRatio: Math.min(rawDpr, cap),
    graphicsTier,
    prefersReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    supportsWebGL: detectWebGL(),
    supportsWebShare: typeof navigator.share === 'function',
    supportsVibration: typeof navigator.vibrate === 'function',
    hardwareConcurrency: cores,
    deviceMemoryGb: memoryGb,
  };
}

export interface PlatformAdapter {
  readonly capabilities: DeviceCapabilities;
  /** Native shell initialisation (status bar, splash, orientation). */
  initialise(): Promise<void>;
  /** Registers the Android hardware back button. Returns a disposer. */
  onBackButton(handler: () => void): () => void;
  /** Registers app foreground/background transitions. Returns a disposer. */
  onAppStateChange(handler: (active: boolean) => void): () => void;
  exitApp(): Promise<void>;
  share(payload: {
    title: string;
    text: string;
    url?: string;
  }): Promise<'shared' | 'copied' | 'failed'>;
}

export class BrowserPlatformAdapter implements PlatformAdapter {
  readonly capabilities: DeviceCapabilities;
  private nativeReady = false;
  private isNative = false;

  constructor() {
    this.capabilities = detectCapabilities();
  }

  async initialise(): Promise<void> {
    if (this.nativeReady || typeof window === 'undefined') return;
    this.nativeReady = true;
    try {
      const { Capacitor } = await import('@capacitor/core');
      this.isNative = Capacitor.isNativePlatform();
      if (!this.isNative) return;

      (this.capabilities as { isNative: boolean }).isNative = true;

      const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import('@capacitor/status-bar'),
        import('@capacitor/splash-screen'),
      ]);
      // Edge-to-edge: the web layer draws under the bars and pads with
      // env(safe-area-inset-*), which keeps one layout across all platforms.
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
      await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
      await SplashScreen.hide({ fadeOutDuration: 260 }).catch(() => undefined);
    } catch {
      this.isNative = false;
    }
  }

  onBackButton(handler: () => void): () => void {
    let disposed = false;
    let remove: (() => void) | null = null;

    void (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('backButton', () => handler());
        if (disposed) {
          await listener.remove();
        } else {
          remove = () => void listener.remove();
        }
      } catch {
        /* not a native build */
      }
    })();

    return () => {
      disposed = true;
      remove?.();
    };
  }

  onAppStateChange(handler: (active: boolean) => void): () => void {
    let disposed = false;
    let removeNative: (() => void) | null = null;

    const onVisibility = () => handler(document.visibilityState === 'visible');
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    void (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('appStateChange', ({ isActive }) =>
          handler(isActive),
        );
        if (disposed) {
          await listener.remove();
        } else {
          removeNative = () => void listener.remove();
        }
      } catch {
        /* not a native build */
      }
    })();

    return () => {
      disposed = true;
      removeNative?.();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }

  async exitApp(): Promise<void> {
    try {
      const { App } = await import('@capacitor/app');
      await App.exitApp();
    } catch {
      /* the web build simply ignores the request */
    }
  }

  async share(payload: {
    title: string;
    text: string;
    url?: string;
  }): Promise<'shared' | 'copied' | 'failed'> {
    // Native share sheet first.
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
          dialogTitle: payload.title,
        });
        return 'shared';
      }
    } catch {
      /* fall through */
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
        return 'shared';
      } catch (error) {
        // A user-cancelled share must not surface as an error.
        if (error instanceof DOMException && error.name === 'AbortError') return 'failed';
      }
    }

    const clipboardText = payload.url ? `${payload.text} ${payload.url}` : payload.text;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clipboardText);
        return 'copied';
      }
    } catch {
      /* fall through to the legacy path */
    }

    try {
      const area = document.createElement('textarea');
      area.value = clipboardText;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok ? 'copied' : 'failed';
    } catch {
      return 'failed';
    }
  }
}

let singleton: PlatformAdapter | null = null;

export function getPlatformAdapter(): PlatformAdapter {
  if (!singleton) singleton = new BrowserPlatformAdapter();
  return singleton;
}

export function setPlatformAdapter(adapter: PlatformAdapter | null): void {
  singleton = adapter;
}
