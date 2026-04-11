/**
 * src/hooks/useSubscription.ts
 *
 * Vérifie si l'utilisateur connecté a un abonnement premium actif
 * en lisant la table `subscriptions` dans Supabase.
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
  const user        = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const cached      = useAuthStore((s) => s.isPremium);
  const setIsPremium = useAuthStore((s) => s.setIsPremium);

  // Initialise depuis le cache Zustand — évite le flash lors des navigations SPA
  const [state, setState] = useState<SubscriptionState>({
    isPremium: cached,
    status: cached ? 'active' : null,
    loading: !cached,
  });

  useEffect(() => {
    // Auth pas encore résolue (page reload) — attendre avant de conclure quoi que ce soit
    if (authLoading) return;

    if (!user) {
      setState({ isPremium: false, status: null, loading: false });
      return;
    }

    // Déjà connu comme premium dans cette session → pas de requête inutile
    if (cached) {
      setState({ isPremium: true, status: 'active', loading: false });
      return;
    }

    supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const status = data?.status ?? null;
        const isPremium = status === 'active' || status === 'trialing';
        if (isPremium) setIsPremium(true); // met en cache pour les navigations suivantes
        setState({ isPremium, status, loading: false });
      });
  }, [user, authLoading, cached, setIsPremium]);

  return state;
}
