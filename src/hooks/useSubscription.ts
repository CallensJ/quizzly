/**
 * src/hooks/useSubscription.ts
 *
 * Lit le statut premium depuis authStore uniquement.
 * La vérification Supabase est centralisée dans AuthProvider —
 * ce hook ne fait qu'exposer l'état du store pour éviter
 * toute race condition entre plusieurs sources de vérité.
 */

"use client";

import { useAuthStore } from "@/stores/authStore";

interface SubscriptionState {
  isPremium: boolean;
  status: string | null;
  loading: boolean;
}

export function useSubscription(): SubscriptionState {
  const isPremium = useAuthStore((s) => s.isPremium);
  const loading = useAuthStore((s) => s.loading);

  return {
    isPremium,
    status: isPremium ? "active" : null,
    loading,
  };
}
