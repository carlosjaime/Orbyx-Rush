import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="bg-void safe-block flex min-h-[100dvh] flex-col items-center justify-center gap-6 text-center">
      <p className="text-primary text-7xl font-black tabular-nums">404</p>
      <div>
        <h1 className="text-ink text-xl font-bold">Órbita perdida</h1>
        <p className="text-ink-muted mt-2 text-sm leading-relaxed">
          Esta ruta no existe en Orbyx Rush.
        </p>
      </div>
      <Link
        href="/"
        className="bg-primary text-void inline-flex min-h-[52px] items-center rounded-2xl px-8 font-bold uppercase"
      >
        Volver al juego
      </Link>
    </div>
  );
}
