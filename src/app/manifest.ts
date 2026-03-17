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
    start_url: '/',
    display: 'standalone',
    // Orientation portrait — optimisée pour enfants sur mobile
    orientation: 'portrait',
    background_color: '#667eea',
    theme_color: '#667eea',
    categories: ['education', 'games', 'kids'],
    icons: [
      {
        // TODO : créer public/icons/icon-192.png (Canva — 192×192)
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // TODO : créer public/icons/icon-512.png (Canva — 512×512)
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // Icône maskable — avec zone de sécurité pour fond coloré (Android)
        // TODO : créer public/icons/icon-512-maskable.png (Canva — ajouter padding 20%)
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
