import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbyx-rush.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Orbyx Rush — Arcade orbital de precisión',
    template: '%s · Orbyx Rush',
  },
  description:
    'Orbyx Rush es un arcade espacial 2D de partidas rápidas: orbita, suéltate en el momento exacto y encadena capturas perfectas. Gratis, sin anuncios y jugable con una sola mano.',
  applicationName: 'Orbyx Rush',
  authors: [{ name: 'RCMX' }],
  creator: 'RCMX',
  publisher: 'RCMX',
  keywords: [
    'Orbyx Rush',
    'juego arcade',
    'juego 2D',
    'juego espacial',
    'órbitas',
    'juego casual',
    'HTML5',
    'PWA',
  ],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Orbyx Rush',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: 'website',
    siteName: 'Orbyx Rush',
    title: 'Orbyx Rush — Arcade orbital de precisión',
    description:
      'Orbita, suéltate en el momento exacto y encadena capturas perfectas. Arcade espacial 2D para una sola mano.',
    url: SITE_URL,
    locale: 'es_ES',
    images: [{ url: '/icons/og-image.svg', width: 1200, height: 630, alt: 'Orbyx Rush' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orbyx Rush — Arcade orbital de precisión',
    description: 'Arcade espacial 2D de partidas rápidas. Gratis y sin anuncios.',
    images: ['/icons/og-image.svg'],
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#04070f',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Pinch-zoom would fight the canvas and there is no text to enlarge inside it.
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
