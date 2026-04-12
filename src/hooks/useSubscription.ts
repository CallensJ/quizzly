/**
 * src/hooks/useSubscription.ts
 *
 * Lit le statut premium depuis le store Zustand (authStore).
 * La vérification Supabase est centralisée dans AuthProvider —
 * ce hook est un simple lecteur de store pour éviter les race conditions.
 *
 * Loading = authStore.loading (contrôlé par AuthProvider, posé à false
 * uniquement après confirmation du statut premium depuis Supabase).
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
