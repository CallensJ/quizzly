/**
 * src/hooks/useSubscription.ts
 *
 * Vérifie si l'utilisateur connecté a un abonnement premium actif
 * en lisant la table `subscriptions` dans Supabase.
 *
 * Principe : on requête toujours Supabase après authentification.
 * Le cache authStore.isPremium sert uniquement à l'affichage optimiste initial
 * (évite le flash cadenas lors des navigations SPA), jamais comme décision définitive.
 *
 * Retourne `isPremium = false` si :
 *   - l'utilisateur n'est pas connecté
 *   - aucun abonnement trouvé
 *   - statut différent de 'active' ou 'trialing'
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

interface SubscriptionState {
  isPremium: boolean;
  status: string | null;
  loading: boolean;
}

export function useSubscription(): SubscriptionState {
  const user         = useAuthStore((s) => s.user);
  const authLoading  = useAuthStore((s) => s.loading);
  const cached       = useAuthStore((s) => s.isPremium);
  const setIsPremium = useAuthStore((s) => s.setIsPremium);

  // Affichage optimiste depuis le cache — évite le flash lors des navigations SPA.
  // Mais on requêtera toujours Supabase pour confirmer.
  const [state, setState] = useState<SubscriptionState>({
    isPremium: cached,
    status: cached ? 'active' : null,
    loading: false,
  });

  useEffect(() => {
    // Attendre la résolution de l'auth (page reload)
    if (authLoading) return;

    if (!user) {
      setState({ isPremium: false, status: null, loading: false });
      setIsPremium(false);
      return;
    }

    // Requête Supabase systématique — le cache n'est jamais la décision finale
    setState((prev) => ({ ...prev, loading: true }));

    supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const status    = data?.status ?? null;
        const isPremium = status === 'active' || status === 'trialing';
        setIsPremium(isPremium); // met à jour le cache (optimisme navigations suivantes)
        setState({ isPremium, status, loading: false });
      });
  // 'cached' retiré des dépendances — on ne court-circuite plus sur le cache
  }, [user, authLoading, setIsPremium]);

  return state;
}
