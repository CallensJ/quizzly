/**
 * src/lib/supabase.ts
 *
 * Client Supabase singleton pour Quizzly.
 * Utilise les variables d'environnement NEXT_PUBLIC_* pour le client-side.
 * Instancié une seule fois — importé par src/lib/sync.ts.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
