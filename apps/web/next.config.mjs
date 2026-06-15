import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load the single root .env so NEXT_PUBLIC_* vars come from one place.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: resolve(root, '.env') });

// Backend origin the BFF proxy forwards to (server-side only).
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ellixr/ui', '@ellixr/shared', '@ellixr/auth'],
  // Same-origin BFF: the browser only ever talks to the web origin, so the
  // refresh cookie is first-party and CORS is sidestepped. /api/v1/* is proxied
  // to the NestJS API server-side.
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_PROXY_TARGET}/api/v1/:path*` }];
  },
};

export default nextConfig;
