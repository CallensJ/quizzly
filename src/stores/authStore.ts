// src/stores/authStore.ts
//
// Store Zustand pour l'état d'authentification Supabase Auth.
// isPremium est persisté dans localStorage (clé 'erudia-auth') pour éviter
// le flash "catégories verrouillées" au F5 — AuthProvider le confirme ensuite.
// User/session ne sont pas persistés — gérés nativement par @supabase/supabase-js.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPremium: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setIsPremium: (isPremium: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: true,
      isPremium: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session, user: session?.user ?? null }),
      setLoading: (loading) => set({ loading }),
      setIsPremium: (isPremium) => set({ isPremium }),

      clearAuth: () =>
        set({ user: null, session: null, loading: false, isPremium: false }),
    }),
    {
      name: "erudia-auth",
      // Persister uniquement isPremium — pas user/session (gérés par Supabase)
      partialize: (state) => ({ isPremium: state.isPremium }),
    },
  ),
);
