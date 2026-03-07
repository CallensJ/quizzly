import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// next-pwa v5 utilise require() — pas d'export ESM compatible
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public',
  // Désactivé en développement — le SW interférerait avec le HMR
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Exclure le manifest next-intl du précache (généré dynamiquement)
  buildExcludes: [/middleware-manifest\.json$/],
});

const nextConfig: NextConfig = {};

// Ordre : withPWA enveloppe la config brute, withNextIntl enveloppe le tout
export default withNextIntl(withPWA(nextConfig));
