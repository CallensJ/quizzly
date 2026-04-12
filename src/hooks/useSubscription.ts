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
 * Robustesse :
 *   - Retry automatique jusqu'à MAX_RETRIES en cas d'erreur Supabase
 *   - Sur erreur : conserve l'état actuel (ne force pas isPremium = false)
 *   - loading: true pendant toute la durée du check — évite l'affichage "non premium" à tort
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
  const user         = useAuthStore((s) => s.user);
  const authLoading  = useAuthStore((s) => s.loading);
  const cached       = useAuthStore((s) => s.isPremium);
  const setIsPremium = useAuthStore((s) => s.setIsPremium);

  // loading: true par défaut — on ne connaît pas encore le statut premium.
  // Évite le flash "non premium / verrouillé" pendant l'initialisation de l'auth.
  // isPremium optimiste depuis le cache pour les navigations SPA (session déjà résolue).
  const [state, setState] = useState<SubscriptionState>({
    isPremium: cached,
    status:    cached ? 'active' : null,
    loading:   true,
  });

  // Ref pour annuler les retries si le composant démonte ou l'user change
  const cancelRef = useRef(false);

  useEffect(() => {
    // Attendre la résolution de l'auth (page reload)
    if (authLoading) return;

    if (!user) {
      setState({ isPremium: false, status: null, loading: false });
      setIsPremium(false);
      return;
    }

    // Réinitialiser le flag d'annulation pour cette exécution
    cancelRef.current = false;
    setState((prev) => ({ ...prev, loading: true }));

    let attempts = 0;

    async function check() {
      if (cancelRef.current) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (cancelRef.current) return;

      if (error) {
        // Erreur Supabase (JWT expiré, réseau, RLS…) — retry sans toucher à l'état
        console.error('[useSubscription] erreur DB:', error.message, '— tentative', attempts + 1);
        if (attempts < MAX_RETRIES) {
          attempts++;
          setTimeout(check, RETRY_DELAY_MS);
        } else {
          // Après tous les retries : on garde l'état optimiste (cached) plutôt que de
          // forcer false — l'utilisateur ne doit pas perdre son accès à cause d'une
          // erreur réseau temporaire
          setState((prev) => ({ ...prev, loading: false }));
        }
        return;
      }

      // Requête réussie (data peut être null si aucune ligne — utilisateur non premium)
      const status    = data?.status ?? null;
      const isPremium = status === 'active' || status === 'trialing';
      setIsPremium(isPremium);
      setState({ isPremium, status, loading: false });
    }

    check();

    // Nettoyage : annule les retries en cours si user/authLoading change
    return () => {
      cancelRef.current = true;
    };
  // 'cached' retiré des dépendances — on ne court-circuite plus sur le cache
  }, [user, authLoading, setIsPremium]);

  return state;
}
