/**
 * src/lib/supabase.ts
 *
 * Client Supabase singleton strict pour le browser.
 *
 * Pourquoi globalThis :
 *   En développement, Next.js Fast Refresh peut réévaluer les modules plusieurs
 *   fois, créant des instances parallèles de createBrowserClient. Chaque instance
 *   tente d'acquérir le Web Lock "sb-*-auth-token" → erreur
 *   "lock was released because another request stole it" + page /admin blanche.
 *   Le pattern globalThis garantit UNE SEULE instance même lors du HMR.
 *
 * Pourquoi createBrowserClient (et non createClient) :
 *   createBrowserClient stocke la session dans les cookies HTTP en plus du
 *   localStorage. Le middleware proxy.ts lit ces cookies via createServerClient
 *   pour protéger les routes /subscribe et /dashboard côté serveur.
 *   Passer à createClient casserait cette protection.
 */

import { createBrowserClient } from '@supabase/ssr';

type BrowserClient = ReturnType<typeof createBrowserClient>;

const _global = globalThis as typeof globalThis & {
  __supabaseClient?: BrowserClient;
};

export const supabase = (_global.__supabaseClient ??= createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
));
