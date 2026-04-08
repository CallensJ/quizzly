/**
 * src/app/layout.tsx
 *
 * Layout racine — requis par Next.js App Router (Next.js 16+).
 * Fournit les balises <html> et <body> exigées au niveau racine.
 *
 * La locale est lue via getLocale() (next-intl/server) qui lit le cookie
 * posé par le middleware (proxy.ts) — disponible avant tout rendu de layout.
 *
 * Les providers (NextIntlClientProvider, AuthProvider, NovaProvider) restent
 * dans [locale]/layout.tsx pour bénéficier des params de segment ([locale]).
 */

import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import './globals.scss';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Erudia',
  description: 'Application de quiz éducatif pour les 6–11 ans',
  // L'app enfant ne doit PAS être indexée — contenu derrière auth, hors scope SEO
  robots: {
    index: false,
    follow: false,
  },
  // ── PWA metadata ──────────────────────────────────────────────────────────
  manifest: '/manifest.webmanifest',
  icons: {
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Erudia',
    startupImage: [
      // iPad Pro 12.9" (2x)
      { url: '/splash/splash-2048x2732.png', media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      // iPad Pro 11" / iPad Air 10.9" (2x)
      { url: '/splash/splash-1668x2388.png', media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      // iPad 10.2" (2x)
      { url: '/splash/splash-1620x2160.png', media: '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      // iPhone 14 Pro Max / 15 Plus
      { url: '/splash/splash-1290x2796.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      // iPhone 14 / 13 / 12
      { url: '/splash/splash-1170x2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      // iPhone SE 3e gen
      { url: '/splash/splash-750x1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
    ],
  },
};

// themeColor doit être dans viewport (Next.js 14+), pas dans metadata
export const viewport: Viewport = {
  themeColor: '#667eea',
  // viewport-fit=cover requis pour que env(safe-area-inset-*) fonctionne.
  // Nécessaire avec statusBarStyle: 'black-translucent' sur iOS PWA.
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // getLocale() lit la locale depuis le contexte de la requête (posée par proxy.ts)
  const locale = await getLocale();

  return (
    <html lang={locale} className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
