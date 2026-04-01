/**
 * src/lib/supabase/admin.ts
 *
 * Client Supabase admin — utilise le service_role key pour bypasser les RLS.
 * Réservé aux opérations serveur légitimes (webhook Stripe, migrations…).
 *
 * ⚠️ SERVEUR UNIQUEMENT — ne jamais importer dans un Client Component.
 * ⚠️ Ne jamais exposer la service_role key côté client (jamais préfixée NEXT_PUBLIC_).
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export function createAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
}
