'use client';

/**
 * src/components/features/auth/AuthProvider.tsx
 *
 * Composant wrapper qui initialise l'état auth Supabase au montage
 * et écoute les changements de session (onAuthStateChange).
 *
 * À placer haut dans l'arbre (layout.tsx) pour que tous les composants
 * puissent accéder à useAuthStore sans re-fetch.
 *
 * Fonctionnement :
 *   1. Au montage : récupère la session existante (localStorage sb-*)
 *   2. S'abonne aux changements (login / logout / token refresh)
 *   3. Met à jour authStore en conséquence
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearAuth  = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    // Récupère la session active (persistée dans localStorage par supabase-js)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Écoute les événements auth (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED…)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
      } else {
        clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading, clearAuth]);

  return <>{children}</>;
}
