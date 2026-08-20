/**
 * src/proxy.ts — Middleware Next.js 16+
 *
 * Deux responsabilités combinées :
 *   1. Protection des routes adultes — redirige vers /auth/login si session absente
 *   2. Routing i18n next-intl — gestion des locales FR/EN
 *
 * Routes protégées (auth Supabase adulte requise) :
 *   - /[locale]/subscribe/*   → paiement Stripe, compte requis
 *   - /[locale]/dashboard/*   → tableau de bord parent
 *   - /[locale]/onboarding/*  → création du 1er profil enfant, compte requis
 *                               pour démarrer l'essai 7 jours (cahier v1.4 §5)
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
// /onboarding : compte parent requis dès le départ pour démarrer l'essai 7 jours
// (cahier-des-charges-claude-v1.4.md §5 — account_trials est lié à auth.users,
// un profil enfant local ne peut plus être créé sans compte).
const PROTECTED_PATHS = ['/subscribe', '/dashboard', '/onboarding'];

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Extrait le chemin sans le préfixe de locale (/fr/subscribe → /subscribe)
  const pathWithoutLocale = pathname.replace(/^\/(fr|en)/, '');
  const isProtected = PROTECTED_PATHS.some((p) => pathWithoutLocale.startsWith(p));

  if (isProtected) {
    // Prépare la réponse en avance pour pouvoir écrire les cookies rafraîchis
    const res = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          // setAll permet au middleware de réécrire un access token expiré mais renouvelable
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // getUser() valide le JWT côté serveur ET rafraîchit le token si nécessaire
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const locale = pathname.match(/^\/(fr|en)/)?.[1] ?? routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/auth/login`, req.url);
      const pathnameWithoutLocale = pathname.replace(/^\/(fr|en)/, '') || '/';
      loginUrl.searchParams.set('next', pathnameWithoutLocale);
      return NextResponse.redirect(loginUrl);
    }

    // Passe à next-intl en transmettant les cookies potentiellement mis à jour
    const intlRes = intlMiddleware(req);
    res.cookies.getAll().forEach(({ name, value }) => intlRes.cookies.set(name, value));
    return intlRes;
  }

  // Passe à next-intl pour la gestion des locales
  return intlMiddleware(req);
}

export const config = {
  // `api` exclu — les routes API n'ont pas de locale (Stripe webhook, checkout, portal…)
  // `offline` exclu — page de fallback PWA servie sans locale
  matcher: ['/((?!_next|_vercel|api|offline|.*\\..*).*)'],
};
