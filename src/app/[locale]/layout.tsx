import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import AuthProvider from "@/components/features/auth/AuthProvider";
import "../globals.scss";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quizzly",
  description: "Application de quiz éducatif pour les 6–11 ans",
  // ── PWA metadata ──────────────────────────────────────────────────────────
  // manifest.webmanifest auto-généré par src/app/manifest.ts
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    // Permet l'installation sur iOS (Add to Home Screen)
    capable: true,
    statusBarStyle: 'default',
    title: 'Quizzly',
  },
};

// themeColor doit être dans viewport (Next.js 14+), pas dans metadata
export const viewport: Viewport = {
  themeColor: '#667eea',
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
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
