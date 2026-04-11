/**
 * src/app/api/auth/callback/route.ts
 *
 * Route handler serveur pour le callback OAuth (Google) et la confirmation email.
 * Remplace l'ancien page.tsx client — exchangeCodeForSession requiert le contexte
 * serveur pour accéder au PKCE verifier stocké dans les cookies HTTP.
 *
 * Flux :
 *   1. Supabase redirige ici avec ?code=...
 *   2. exchangeCodeForSession échange le code contre une session (PKCE côté serveur)
 *   3. Redirige vers /{locale}/admin si succès, /{locale}/auth/login si erreur
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code   = searchParams.get('code');
  const locale = searchParams.get('locale') || 'fr';
  const type   = searchParams.get('type');
  const next   = searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/auth/login?error=no_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(`${origin}/${locale}/auth/login?error=callback_failed`);
  }

  // Succès — rediriger vers `next` si fourni (ex: /subscribe), sinon /admin
  const destination = next && next.startsWith('/') ? next : '/admin';
  return NextResponse.redirect(`${origin}/${locale}${destination}`);
}
