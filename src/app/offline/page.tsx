import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sin conexión',
  robots: { index: false, follow: false },
};

/**
 * Fallback served by the service worker when a navigation fails and the shell
 * is not in the cache. The game itself works fully offline once installed.
 */
export default function OfflinePage() {
  return (
    <div className="bg-void safe-block flex min-h-[100dvh] flex-col items-center justify-center gap-6 text-center">
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true">
        <circle
          cx="44"
          cy="44"
          r="34"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeDasharray="6 9"
          opacity="0.6"
        />
        <path
          d="M28 28l32 32"
          stroke="var(--color-danger)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>

      <div>
        <h1 className="text-primary text-2xl font-black tracking-[0.14em] uppercase">
          Sin conexión
        </h1>
        <p className="text-ink-muted mt-3 max-w-sm text-sm leading-relaxed">
          No hemos podido cargar esta página. Orbyx Rush funciona sin conexión una vez instalado:
          vuelve a la pantalla principal para seguir jugando.
        </p>
      </div>

      <Link
        href="/"
        className="bg-primary text-void inline-flex min-h-[52px] items-center rounded-2xl px-8 font-bold uppercase"
      >
        Reintentar
      </Link>

      <p className="text-ink-faint text-[10px] tracking-[0.2em] uppercase">RCMX</p>
    </div>
  );
}
