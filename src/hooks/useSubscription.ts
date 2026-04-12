/**
 * src/hooks/useSubscription.ts
 *
 * Vérifie si l'utilisateur connecté a un abonnement premium actif
 * en lisant la table `subscriptions` dans Supabase.
 *
 * Approche : bypasse le store React (authLoading/user) et interroge
 * directement supabase.auth.getUser() — le client Supabase gère sa propre
 * session (refresh token, cookies) indépendamment de l'état React.
 *
 * Avantages :
 *   - Fonctionne même si AuthProvider n'a pas encore résolu authLoading
 *   - Retry automatique sur erreur Supabase (réseau, JWT, etc.)
 *   - Ne force jamais isPremium = false sur erreur (conserve l'état optimiste)
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

interface SubscriptionState {
  isPremium: boolean;
  status: string | null;
  loading: boolean;
}

const MAX_RETRIES    = 4;
const RETRY_DELAY_MS = 1500;

export function useSubscription(): SubscriptionState {
  const cached       = useAuthStore((s) => s.isPremium);
  const setIsPremium = useAuthStore((s) => s.setIsPremium);

  // Affichage optimiste depuis le cache — évite le flash lors des navigations SPA.
  // loading: true jusqu'à confirmation DB — évite d'afficher "go premium" à tort.
  const [state, setState] = useState<SubscriptionState>({
    isPremium: cached,
    status:    cached ? 'active' : null,
    loading:   true,
  });

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    let attempts = 0;

    async function check() {
      if (cancelledRef.current) return;

      // getUser() vérifie la session Supabase directement (auto-refresh inclus)
      // sans dépendre de authLoading du store React
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (cancelledRef.current) return;

      if (userError || !user) {
        // Pas de session valide — utilisateur non connecté
        setState({ isPremium: false, status: null, loading: false });
        setIsPremium(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelledRef.current) return;

      if (error) {
        // Erreur DB : retry sans forcer isPremium = false
        console.error('[useSubscription] erreur DB (tentative', attempts + 1, '):', error.message);
        if (attempts < MAX_RETRIES) {
          attempts++;
          setTimeout(check, RETRY_DELAY_MS);
        } else {
          // Après tous les retries : loading terminé, on garde l'état optimiste du cache
          setState((prev) => ({ ...prev, loading: false }));
        }
        return;
      }

      // Résultat définitif — data = null si l'utilisateur n'est pas premium
      const status    = data?.status ?? null;
      const isPremium = status === 'active' || status === 'trialing';
      setIsPremium(isPremium);
      setState({ isPremium, status, loading: false });
    }

    check();

    return () => {
      cancelledRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
