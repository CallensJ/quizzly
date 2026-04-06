/**
 * src/app/manifest.ts
 *
 * Web App Manifest — Next.js App Router génère automatiquement la route /manifest.webmanifest.
 * Requis pour que le navigateur reconnaisse l'app comme PWA installable.
 *
 * Icônes : les PNGs 192x192 et 512x512 sont à créer (Canva) et placer dans public/icons/.
 * Sans icônes PNG valides, le prompt d'installation ne s'affiche pas.
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Erudia',
    short_name: 'Erudia',
    description: 'Application de quiz éducatif pour les 6–11 ans',
    // '/?source=pwa' — next-intl redirige vers la locale détectée (/fr/home ou /en/home).
    // Le paramètre source=pwa permet de tracker les sessions issues de l'installation PWA.
    // Ne pas hardcoder '/fr/home' : brise les appareils en langue anglaise.
    start_url: '/?source=pwa',
    display: 'standalone',
    // Orientation portrait — optimisée pour enfants sur mobile
    orientation: 'portrait',
    background_color: '#667eea',
    theme_color: '#667eea',
    categories: ['education', 'games', 'kids'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // Icône maskable — avec zone de sécurité pour fond coloré (Android)
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    // Screenshots requis pour le "Richer Install UI" dans Chrome/Android
    // Dimensions minimales recommandées : 1080×1920 (mobile) et 1280×800 (desktop)
    screenshots: [
      {
        src: '/screenshots/mobile.png',
        sizes: '1080x1920',
        type: 'image/png',
        // form_factor absent = mobile
      },
      {
        src: '/screenshots/desktop.png',
        sizes: '1280x800',
        type: 'image/png',
        form_factor: 'wide',
      },
    ],
  };
}
