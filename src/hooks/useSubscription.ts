/**
 * src/hooks/useSubscription.ts
 *
 * Vérifie si l'utilisateur connecté a un abonnement premium actif
 * en lisant la table `subscriptions` dans Supabase.
 *
 * Approche : bypasse le store React (authLoading/user) et interroge
 * directement supabase.auth.getUser() — le client Supabase gère sa propre
 * session (refresh token, cookies) indépendamment de l'état React.
 *
 * Avantages :
 *   - Fonctionne même si AuthProvider n'a pas encore résolu authLoading
 *   - Retry automatique sur erreur Supabase (réseau, JWT, etc.)
 *   - Ne force jamais isPremium = false sur erreur (conserve l'état optimiste)
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";

interface SubscriptionState {
  isPremium: boolean;
  status: string | null;
  loading: boolean;
}

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 1500;

export function useSubscription(): SubscriptionState {
  const cached = useAuthStore((s) => s.isPremium);
  const setIsPremium = useAuthStore((s) => s.setIsPremium);

  const [state, setState] = useState<SubscriptionState>({
    isPremium: cached,
    status: cached ? "active" : null,
    loading: true,
  });

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    async function checkForUser(userId: string) {
      let attempts = 0;

      async function query() {
        if (cancelledRef.current) return;

        const { data, error } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", userId)
          .maybeSingle();

        if (cancelledRef.current) return;

        if (error) {
          console.error(
            "[useSubscription] erreur DB (tentative",
            attempts + 1,
            "):",
            error.message,
          );
          if (attempts < MAX_RETRIES) {
            attempts++;
            setTimeout(query, RETRY_DELAY_MS);
          } else {
            setState((prev) => ({ ...prev, loading: false }));
          }
          return;
        }

        const status = data?.status ?? null;
        const isPremium = status === "active" || status === "trialing";
        setIsPremium(isPremium);
        setState({ isPremium, status, loading: false });
      }

      await query();
    }

    // onAuthStateChange émet INITIAL_SESSION dès que Supabase
    // a hydraté le token depuis localStorage — plus fiable que getUser() au montage
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelledRef.current) return;

      if (!session?.user) {
        setState({ isPremium: false, status: null, loading: false });
        setIsPremium(false);
        return;
      }

      // SIGNED_IN ou INITIAL_SESSION → on vérifie Supabase
      await checkForUser(session.user.id);
    });

    return () => {
      cancelledRef.current = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
