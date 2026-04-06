/**
 * src/app/layout.tsx
 *
 * Layout racine minimal — requis par Next.js App Router pour les routes
 * hors du segment [locale] (ex: /offline, page de fallback PWA).
 *
 * Le layout principal de l'app (fonts, providers, meta) est dans [locale]/layout.tsx.
 * Ce fichier est un simple passthrough pour satisfaire la contrainte Next.js
 * "chaque page doit avoir un root layout".
 *
 * Le metadata robots: noindex ici garantit qu'aucune route de l'app
 * ne soit indexée par les moteurs de recherche, même si [locale] n'est pas atteint.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
