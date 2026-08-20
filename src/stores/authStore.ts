// src/stores/authStore.ts
//
// Store Zustand pour l'état d'authentification Supabase Auth.
// isPremium est persisté dans localStorage (clé 'erudia-auth') pour éviter
// le flash "catégories verrouillées" au F5 — AuthProvider le confirme ensuite.
// User/session ne sont pas persistés — gérés nativement par @supabase/supabase-js.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Statut d'accès détaillé (cahier-des-charges-claude-v1.4.md §5 — essai 7 jours).
 * `isPremium` reste le booléen simple utilisé par le gate d'accès existant
 * (true pour 'premium' ET 'trial') — accessStatus sert à l'affichage détaillé
 * (bannière d'essai, compte à rebours) sans toucher au gate lui-même.
 */
export type AccessStatus = 'loading' | 'premium' | 'trial' | 'expired';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPremium: boolean;
  accessStatus: AccessStatus;
  /** Date de fin d'essai (ISO) — uniquement significatif quand accessStatus === 'trial'. */
  trialEndsAt: string | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setIsPremium: (isPremium: boolean) => void;
  /** Fixe le statut d'accès détaillé et, le cas échéant, la date de fin d'essai. */
  setAccessStatus: (status: AccessStatus, trialEndsAt?: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: true,
      isPremium: false,
      accessStatus: 'loading',
      trialEndsAt: null,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session, user: session?.user ?? null }),
      setLoading: (loading) => set({ loading }),
      setIsPremium: (isPremium) => set({ isPremium }),
      setAccessStatus: (accessStatus, trialEndsAt = null) =>
        set({ accessStatus, trialEndsAt }),

      clearAuth: () =>
        set({
          user: null,
          session: null,
          loading: false,
          isPremium: false,
          accessStatus: 'loading',
          trialEndsAt: null,
        }),
    }),
    {
      name: "erudia-auth",
      // Persister isPremium + accessStatus — pas user/session (gérés par Supabase)
      partialize: (state) => ({
        isPremium: state.isPremium,
        accessStatus: state.accessStatus,
        trialEndsAt: state.trialEndsAt,
      }),
    },
  ),
);
