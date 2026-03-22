'use client';

/**
 * src/components/features/auth/AuthProvider.tsx
 *
 * Composant wrapper qui initialise l'état auth Supabase au montage
 * et écoute les changements de session (onAuthStateChange).
 *
 * Responsabilités MVP 2+ :
 *   1. Initialise authStore depuis la session Supabase persistée (localStorage sb-*)
 *   2. Lance useOnlineSync : rejoue la queue offline au retour de connexion
 *   3. Sur SIGNED_IN : sync bidirectionnelle Supabase → local (sessions + badges)
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { pullFromSupabase } from '@/lib/sync';
import { useOnlineSync } from '@/hooks/useOnlineSync';
import { useGoalNotification } from '@/hooks/useGoalNotification';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearAuth  = useAuthStore((s) => s.clearAuth);

  // Rejoue la queue offline dès le retour de connexion
  useOnlineSync();
  // Vérifie au démarrage si l'objectif journalier d'hier a été atteint
  useGoalNotification();

  useEffect(() => {
    // Récupère la session active (persistée dans localStorage par supabase-js)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Écoute les événements auth (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED…)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setSession(session);

        // SIGNED_IN : sync bidirectionnelle — tire les données cloud dans le store local
        // Utile si l'enfant a joué sur un autre appareil depuis la dernière connexion.
        if (event === 'SIGNED_IN') {
          const { deviceId, mergeFromRemote } = useProfileStore.getState();
          if (deviceId) {
            const pulled = await pullFromSupabase(deviceId);
            if (pulled) {
              mergeFromRemote(pulled.sessions, pulled.earnedBadgeIds);
            }
          }
        }
      } else {
        clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading, clearAuth]);

  return <>{children}</>;
}
