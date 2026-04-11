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
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<SubscriptionState>({
    isPremium: false,
    status: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ isPremium: false, status: null, loading: false });
      return;
    }

    supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[useSubscription] erreur RLS/query:', error);
        console.log('[useSubscription] user.id:', user.id, '| data:', data);
        const status = data?.status ?? null;
        const isPremium = status === 'active' || status === 'trialing';
        setState({ isPremium, status, loading: false });
      });
  }, [user]);

  return state;
}
