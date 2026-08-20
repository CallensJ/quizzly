/**
 * src/hooks/useSubscription.ts
 *
 * Lit le statut d'accès depuis authStore uniquement.
 * La vérification Supabase est centralisée dans AuthProvider —
 * ce hook ne fait qu'exposer l'état du store pour éviter
 * toute race condition entre plusieurs sources de vérité.
 *
 * trialDaysLeft est calculé à chaque appel (jamais stocké) pour ne jamais
 * devenir périmé si l'onglet reste ouvert plusieurs jours.
 */

"use client";

import { useAuthStore, type AccessStatus } from "@/stores/authStore";

interface SubscriptionState {
  isPremium: boolean;
  /** 'active' (abonné), 'trialing' (essai gratuit en cours), ou null (aucun accès). */
  status: 'active' | 'trialing' | null;
  accessStatus: AccessStatus;
  /** Jours restants avant la fin de l'essai — null hors essai en cours. */
  trialDaysLeft: number | null;
  loading: boolean;
}

function daysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

export function useSubscription(): SubscriptionState {
  const isPremium = useAuthStore((s) => s.isPremium);
  const accessStatus = useAuthStore((s) => s.accessStatus);
  const trialEndsAt = useAuthStore((s) => s.trialEndsAt);
  const loading = useAuthStore((s) => s.loading);

  return {
    isPremium,
    status: accessStatus === 'premium' ? 'active' : accessStatus === 'trial' ? 'trialing' : null,
    accessStatus,
    trialDaysLeft: accessStatus === 'trial' ? daysLeft(trialEndsAt) : null,
    loading,
  };
}
