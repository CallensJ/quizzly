'use client';

/**
 * src/app/[locale]/auth/callback/page.tsx
 *
 * Handler du redirect OAuth (Google) et de la confirmation email.
 * Supabase redirige ici avec un code dans l'URL : ?code=...
 *
 * Ce composant :
 *   1. Lit le code dans l'URL (searchParams)
 *   2. L'échange contre une session via exchangeCodeForSession()
 *   3. Redirige vers /admin si succès, ou /auth/login si erreur
 *
 * Cas gérés :
 *   - type=recovery → reset de mot de passe (pas encore d'UI dédiée — MVP futur)
 *   - Toute autre confirmation → login normal → /admin
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLocale } from 'next-intl';

export default function AuthCallbackPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const locale       = useLocale();

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const type = searchParams.get('type');

      if (!code) {
        // Pas de code — redirect vers le login
        router.replace(`/${locale}/auth/login`);
        return;
      }

      // Échange le code contre une session Supabase
      console.log('[callback] exchangeCodeForSession start');
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      console.log('[callback] exchangeCodeForSession done', { error });

      if (error) {
        console.error('[callback] error:', error);
        // En cas d'erreur, redirige vers le login avec un paramètre d'erreur
        router.replace(`/${locale}/auth/login?error=callback_failed`);
        return;
      }

      console.log('[callback] redirecting to admin');
      if (type === 'recovery') {
        router.replace(`/${locale}/admin`);
      } else {
        router.replace(`/${locale}/admin`);
      }
    }

    handleCallback();
  }, [searchParams, router, locale]);

  // Écran de chargement pendant l'échange du code
  return (
    <div className="auth-callback">
      <div className="auth-callback__spinner" aria-label="Connexion en cours…" role="status" />
      <p className="auth-callback__msg">Connexion en cours…</p>
    </div>
  );
}
