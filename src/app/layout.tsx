/**
 * src/app/layout.tsx
 *
 * Layout racine minimal — requis par Next.js App Router pour les routes
 * hors du segment [locale] (ex: /offline, page de fallback PWA).
 *
 * Le layout principal de l'app (fonts, providers, meta) est dans [locale]/layout.tsx.
 * Ce fichier est un simple passthrough pour satisfaire la contrainte Next.js
 * "chaque page doit avoir un root layout".
 */

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
