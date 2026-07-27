import type { NextConfig } from 'next';

/**
 * Orbyx Rush ships as a fully static bundle so the exact same artefact can be
 * served from Vercel and embedded inside the Capacitor Android / iOS shells.
 */
const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;
