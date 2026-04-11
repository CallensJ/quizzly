// src/stores/authStore.ts
//
// Store Zustand pour l'état d'authentification Supabase Auth.
// Pas de persist — la session est gérée nativement par @supabase/supabase-js
// dans localStorage (clé 'sb-*'). Ce store expose juste l'état réactif.
//
// Utilisateurs cibles : adultes (parents) uniquement.
// Les enfants n'ont pas de compte — ils utilisent l'app en local-first.

import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  // true pendant la vérification initiale de session (évite le flash "non connecté")
  loading: boolean;
  // Cache de statut premium — évite le flash "verrouillé" lors des navigations SPA
  isPremium: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setIsPremium: (isPremium: boolean) => void;
  // Reset complet à la déconnexion
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  loading: true, // démarre à true — initialisé dans AuthProvider
  isPremium: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading: (loading) => set({ loading }),
  setIsPremium: (isPremium) => set({ isPremium }),

  clearAuth: () =>
    set({ user: null, session: null, loading: false, isPremium: false }),
}));
