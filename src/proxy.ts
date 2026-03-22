// src/proxy.ts — Proxy next-intl pour la gestion des locales (FR/EN)
// Next.js 16+ : convention "proxy.ts" remplace "middleware.ts"
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // `offline` exclu — page de fallback PWA servie sans locale (pas de redirect next-intl)
  matcher: ['/((?!_next|_vercel|offline|.*\\..*).*)'],
};
