/**
 * next.config.ts
 *
 * Configuration Next.js :
 * - next-intl : routing i18n FR/EN
 * - @ducanh2912/next-pwa : génération automatique du Service Worker (Workbox)
 *   Fork maintenu de next-pwa v5, sans les vulnérabilités serialize-javascript.
 *
 * Stratégies de cache Workbox :
 *   - DiceBear API    → CacheFirst (avatars stables, TTL 30 jours)
 *   - Google Fonts    → StaleWhileRevalidate (police Nunito, TTL 1 an)
 *   - Pages Next.js   → NetworkFirst avec fallback offline (TTL 24h, timeout 3s)
 *   - JS/CSS bundles  → StaleWhileRevalidate (assets Next.js buildés)
 *   - Supabase API    → NetworkFirst (questions, timeout 3s, fallback cache)
 *
 * Le SW est désactivé en développement pour éviter les conflits HMR.
 */

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// ─── Headers de sécurité HTTP ────────────────────────────────────────────────
// Appliqués sur toutes les routes sauf le webhook Stripe (CSP exclu sur /api/stripe/webhook).
const securityHeaders = [
  // Protection clickjacking — interdit d'intégrer l'app dans un iframe externe
  { key: "X-Frame-Options", value: "DENY" },
  // Empêche le MIME sniffing — le navigateur respecte le Content-Type déclaré
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Contrôle les infos de referrer envoyées aux sites tiers
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Désactive les features non utilisées par l'app
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Force HTTPS pendant 1 an (Vercel gère HTTPS, ce header renforce côté client)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Content Security Policy — whitelist explicite des sources autorisées
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts : self + Stripe.js (Checkout) + inline Next.js (hydration)
      // 'unsafe-eval' requis en dev : React l'utilise pour reconstruire les call stacks
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
      // Styles : self + Google Fonts + inline (Framer Motion + SCSS)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts : Google Fonts uniquement
      "font-src 'self' https://fonts.gstatic.com",
      // iframes : Stripe Checkout + hooks Stripe
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // Connexions réseau : API Stripe + Supabase (REST + WebSocket temps réel)
      "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co",
      // Images : self + DiceBear avatars + data URIs + blobs (canvas-confetti)
      "img-src 'self' data: blob: https://api.dicebear.com",
      // Service Worker (PWA)
      "worker-src 'self' blob:",
      // Manifest PWA
      "manifest-src 'self'",
    ].join("; "),
  },
];

// @ducanh2912/next-pwa utilise require() — pas d'export ESM compatible
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  // Désactivé en développement — le SW interférerait avec le HMR
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Exclure le manifest next-intl du précache (généré dynamiquement)
  buildExcludes: [/middleware-manifest\.json$/],
  // Fallback servi par le SW quand la page demandée n'est pas dans le cache
  // et que le réseau est indisponible. Évite la page native "you're offline".
  // ⚠️  La page /offline DOIT exister dans src/app/[locale]/offline/page.tsx
  fallbacks: {
    document: "/offline",
  },

  // --- Stratégies de cache runtime (Workbox) ---
  runtimeCaching: [
    {
      // Avatars DiceBear — stables, on peut servir depuis le cache
      urlPattern: /^https:\/\/api\.dicebear\.com\//,
      handler: "CacheFirst",
      options: {
        cacheName: "dicebear-avatars",
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
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 10,
          // 1 an — la police ne change pas
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Assets Next.js (JS chunks, CSS) — servis depuis le cache,
      // mis à jour en arrière-plan quand le réseau est dispo.
      // Critique pour l'offline : sans ça, les bundles JS ne sont pas cachés
      // et les pages ne peuvent pas s'hydrater.
      urlPattern: /\/_next\/static\/.*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-static-assets",
        expiration: {
          maxEntries: 256,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Requêtes Supabase (questions, profils) — NetworkFirst avec timeout court.
      // En offline, le SW sert la réponse cachée immédiatement après 3s.
      // Complète le fallback IndexedDB dans questions.ts.
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-api",
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24h
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Pages Next.js — NetworkFirst : on essaie le réseau, fallback cache
      // Couvre les routes /fr/* et /en/* (next-intl) ainsi que les payloads RSC
      // ⚠️  networkTimeoutSeconds: 3 — en offline, on veut un fallback RAPIDE,
      //     pas 10s d'attente dans le vide. 3s est le sweet spot.
      urlPattern: /\/(fr|en)(\/|$)/,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        networkTimeoutSeconds: 3,
        expiration: {
          // 128 entrées : pages HTML + payloads RSC (navigation client Next.js)
          maxEntries: 128,
          // 24h — les pages peuvent se mettre à jour
          maxAgeSeconds: 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  images: {
    // Autorise next/image à charger les avatars DiceBear (SVGs externes).
    // unoptimized={true} doit être passé sur chaque <Image> DiceBear car Next.js
    // ne peut pas optimiser (convertir en WebP) un SVG servi dynamiquement.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      // Headers de sécurité sur toutes les routes
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Le webhook Stripe n'a pas besoin de CSP — endpoint purement serveur
      // On surcharge uniquement X-Content-Type-Options pour cette route
      {
        source: "/api/stripe/webhook",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

// Ordre : withPWA enveloppe la config brute, withNextIntl enveloppe le tout
export default withNextIntl(withPWA(nextConfig));
