/**
 * src/lib/supabase.ts
 *
 * Client Supabase singleton pour Quizzly.
 * Utilise les variables d'environnement NEXT_PUBLIC_* pour le client-side.
 * Instancié une seule fois — importé par src/lib/sync.ts.
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createBrowserClient (@supabase/ssr) stocke la session dans les cookies
// (en plus du localStorage), ce qui permet au middleware proxy.ts de lire
// la session côté serveur via req.cookies pour protéger les routes.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
