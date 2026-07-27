import { GameShell } from '@/components/game/GameShell';

/**
 * The whole game lives at `/`.
 *
 * The route itself is a static shell — every interactive part is a client
 * component, which is what lets `output: 'export'` produce a bundle that runs
 * identically on Vercel and inside the Capacitor WebView.
 */
export default function HomePage() {
  return <GameShell />;
}
