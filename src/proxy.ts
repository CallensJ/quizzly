/**
 * src/proxy.ts — Middleware Next.js 16+
 *
 * Deux responsabilités combinées :
 *   1. Protection des routes adultes — redirige vers /auth/login si session absente
 *   2. Routing i18n next-intl — gestion des locales FR/EN
 *
 * Routes protégées (auth Supabase adulte requise) :
 *   - /[locale]/subscribe/*  → paiement Stripe, compte requis
 *   - /[locale]/dashboard/*  → tableau de bord parent
 *
 * Note : /admin est protégé par PIN localStorage (PinModal), pas par Supabase Auth.
 * Le middleware ne protège donc pas /admin — c'est intentionnel.
 *
 * Fonctionnement de la vérification auth :
 *   - createServerClient (@supabase/ssr) lit le cookie sb-*-auth-token
 *   - supabase.auth.getUser() valide le JWT auprès du serveur Supabase
 *   - Si non authentifié → redirect /{locale}/auth/login
 */

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Chemins protégés — sans préfixe de locale (ex: '/subscribe', pas '/fr/subscribe')
const PROTECTED_PATHS = ['/subscribe', '/dashboard'];

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Extrait le chemin sans le préfixe de locale (/fr/subscribe → /subscribe)
  const pathWithoutLocale = pathname.replace(/^\/(fr|en)/, '');
  const isProtected = PROTECTED_PATHS.some((p) => pathWithoutLocale.startsWith(p));

  if (isProtected) {
    // Vérifie la session Supabase depuis les cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // Lecture seule dans le middleware — pas d'écriture de cookie nécessaire
          getAll: () => req.cookies.getAll(),
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Extraire la locale pour construire le redirect avec la bonne langue
      const locale = pathname.match(/^\/(fr|en)/)?.[1] ?? routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/auth/login`, req.url);
      // Mémoriser l'URL demandée pour rediriger après connexion (optionnel — UX)
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Passe à next-intl pour la gestion des locales
  return intlMiddleware(req);
}

export const config = {
  // `api` exclu — les routes API n'ont pas de locale (Stripe webhook, checkout, portal…)
  // `offline` exclu — page de fallback PWA servie sans locale
  matcher: ['/((?!_next|_vercel|api|offline|.*\\..*).*)'],
};
