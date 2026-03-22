/**
 * next.config.ts
 *
 * Configuration Next.js :
 * - next-intl : routing i18n FR/EN
 * - @ducanh2912/next-pwa : génération automatique du Service Worker (Workbox)
 *   Fork maintenu de next-pwa v5, sans les vulnérabilités serialize-javascript.
 *
 * Stratégies de cache Workbox :
 *   - DiceBear API   → CacheFirst (avatars stables, TTL 30 jours)
 *   - Google Fonts   → StaleWhileRevalidate (police Nunito, TTL 1 an)
 *   - Pages Next.js  → NetworkFirst avec fallback offline (TTL 24h)
 *
 * Le SW est désactivé en développement pour éviter les conflits HMR.
 */

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// @ducanh2912/next-pwa utilise require() — pas d'export ESM compatible
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  // Désactivé en développement — le SW interférerait avec le HMR
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Exclure le manifest next-intl du précache (généré dynamiquement)
  buildExcludes: [/middleware-manifest\.json$/],
  // Fallback servi par le SW quand la page demandée n'est pas dans le cache
  // et que le réseau est indisponible. Évite la page native "you're offline".
  fallbacks: {
    document: '/offline',
  },

  // --- Stratégies de cache runtime (Workbox) ---
  runtimeCaching: [
    {
      // Avatars DiceBear — stables, on peut servir depuis le cache
      urlPattern: /^https:\/\/api\.dicebear\.com\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'dicebear-avatars',
        expiration: {
          maxEntries: 50,
          // 30 jours — l'avatar d'un enfant ne change pas souvent
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Police Nunito depuis Google Fonts
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 10,
          // 1 an — la police ne change pas
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Pages Next.js — NetworkFirst : on essaie le réseau, fallback cache
      // Couvre les routes /fr/* et /en/* (next-intl)
      urlPattern: /^\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 32,
          // 24h — les pages peuvent se mettre à jour
          maxAgeSeconds: 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

const nextConfig: NextConfig = {};

// Ordre : withPWA enveloppe la config brute, withNextIntl enveloppe le tout
export default withNextIntl(withPWA(nextConfig));
