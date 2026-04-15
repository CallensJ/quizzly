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
 *
 * Pourquoi _makeClient() et non ReturnType<typeof createBrowserClient> :
 *   createBrowserClient est générique. ReturnType sur une fonction générique
 *   évalue tous les paramètres à leurs défauts — SchemaName passe de "public"
 *   à string, ce qui élargit le type de supabase.auth.onAuthStateChange et
 *   rend ses paramètres implicitement any. Le wrapper non-générique capture
 *   le type exact de l'appel concret (SupabaseClient<any, "public", any>).
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Wrapper non-générique — ReturnType<typeof _makeClient> capture le type concret
function _makeClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}

const _global = globalThis as typeof globalThis & {
  __supabaseClient?: ReturnType<typeof _makeClient>;
};

_global.__supabaseClient ??= _makeClient();

// Non-null assertion sûre : l'initialisation ci-dessus garantit la valeur
export const supabase = _global.__supabaseClient!;
