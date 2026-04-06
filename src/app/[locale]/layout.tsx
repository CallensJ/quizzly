import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import AuthProvider from "@/components/features/auth/AuthProvider";
import NovaProvider from "@/components/mascotte/NovaProvider";
import "../globals.scss";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Erudia",
  description: "Application de quiz éducatif pour les 6–11 ans",
  // L'app enfant ne doit PAS être indexée — contenu derrière auth, hors scope SEO
  robots: {
    index: false,
    follow: false,
  },
  // ── PWA metadata ──────────────────────────────────────────────────────────
  // manifest.webmanifest auto-généré par src/app/manifest.ts
  manifest: '/manifest.webmanifest',
  // iOS Safari lit <link rel="apple-touch-icon"> — pas le manifest.
  // Sans apple-touch-icon.png (180×180), l'icône d'accueil est un screenshot.
  icons: {
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    // Permet l'installation via "Ajouter à l'écran d'accueil" sur iOS
    capable: true,
    // 'black-translucent' : barre de statut transparente sur fond violet.
    // Nécessite padding-top dans l'app pour éviter le chevauchement (env(safe-area-inset-top)).
    statusBarStyle: 'black-translucent',
    title: 'Erudia',
    // Splash screens iOS — un par résolution iPad/iPhone.
    // Fichiers à créer dans public/splash/ avec les dimensions exactes.
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

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'en' | 'fr')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={nunito.variable}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {/* AuthProvider initialise la session Supabase Auth au montage */}
          <AuthProvider>
            {children}
            {/* NovaProvider rend NovaMascot globalement sur toutes les pages */}
            <NovaProvider />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
