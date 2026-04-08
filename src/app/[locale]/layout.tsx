/**
 * src/app/[locale]/layout.tsx
 *
 * Layout de segment [locale] — providers i18n, auth et mascotte.
 *
 * Note : <html> et <body> sont désormais dans app/layout.tsx (root layout),
 * conformément à la contrainte Next.js 16+ qui les exige au niveau racine.
 * Ce layout reçoit les params de segment pour valider la locale et charger
 * les messages next-intl.
 */

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import AuthProvider from '@/components/features/auth/AuthProvider';
import NovaProvider from '@/components/mascotte/NovaProvider';

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
    <NextIntlClientProvider messages={messages}>
      {/* AuthProvider initialise la session Supabase Auth au montage */}
      <AuthProvider>
        {children}
        {/* NovaProvider rend NovaMascot globalement sur toutes les pages */}
        <NovaProvider />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
