/**
 * src/lib/supabase/server.ts
 *
 * Client Supabase SSR — lit la session depuis les cookies HTTP.
 * À utiliser dans les Server Components et Route Handlers Next.js App Router.
 *
 * Différence avec lib/supabase.ts (client browser) :
 *   - lib/supabase.ts    → singleton browser, lit la session depuis localStorage
 *   - lib/supabase/server.ts → lit la session depuis les cookies (SSR-safe)
 *
 * ⚠️ Ne jamais importer dans un Client Component ('use client').
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    }
  );
}
