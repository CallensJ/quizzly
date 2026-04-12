"use client";

/**
 * src/components/features/auth/AuthProvider.tsx
 *
 * Composant wrapper qui initialise l'état auth Supabase au montage
 * et écoute les changements de session (onAuthStateChange).
 *
 * Responsabilités :
 *   1. Source unique de vérité pour isPremium — vérifie Supabase avant setLoading(false)
 *   2. Lance useOnlineSync : rejoue la queue offline au retour de connexion
 *   3. Sur SIGNED_IN : sync bidirectionnelle Supabase → local (sessions + badges)
 *
 * Pourquoi getSession() est supprimé :
 *   onAuthStateChange émet toujours INITIAL_SESSION au premier montage avec
 *   la session persistée — getSession() en parallèle créait une race condition
 *   où setLoading(false) était appelé avant la vérification premium.
 */

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { pullFromSupabase, linkProfileToAuthUser } from "@/lib/sync";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import { useGoalNotification } from "@/hooks/useGoalNotification";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setIsPremium = useAuthStore((s) => s.setIsPremium);

  useOnlineSync();
  useGoalNotification();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // ── Pas de session → reset complet ──────────────────────────────────
      if (!session) {
        clearAuth(); // inclut setLoading(false) et isPremium: false
        return;
      }

      // ── Session présente ─────────────────────────────────────────────────
      setSession(session);
      const userId = session.user.id;

      // INITIAL_SESSION : premier chargement (F5 / navigation directe)
      // setLoading(false) est posé APRÈS confirmation premium — évite le flash
      if (event === "INITIAL_SESSION") {
        let retries = 0;

        async function checkPremium() {
          const { data: sub, error } = await supabase
            .from("subscriptions")
            .select("status")
            .eq("user_id", userId)
            .maybeSingle();

          const isPremium =
            sub?.status === "active" || sub?.status === "trialing";

          if (isPremium) {
            setIsPremium(true);
            setLoading(false); // ← confirmé premium, on débloque l'UI
            return;
          }

          // Pas premium mais pas d'erreur DB → résultat définitif
          if (!error) {
            setIsPremium(false);
            setLoading(false);
            return;
          }

          // Erreur DB → retry (réseau, JWT expiré…)
          if (retries < MAX_RETRIES) {
            retries++;
            setTimeout(checkPremium, RETRY_DELAY_MS);
            return;
          }

          // Tous les retries épuisés → on débloque quand même l'UI
          setIsPremium(false);
          setLoading(false);
        }

        await checkPremium();
        return;
      }

      // SIGNED_IN : connexion active — lien profil + sync cross-device
      if (event === "SIGNED_IN") {
        const { deviceId, mergeFromRemote } = useProfileStore.getState();

        if (deviceId) {
          await linkProfileToAuthUser(deviceId, userId);
        }

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", userId)
          .maybeSingle();

        const isPremium =
          sub?.status === "active" || sub?.status === "trialing";

        setIsPremium(isPremium);
        setLoading(false);

        if (!isPremium) return;

        const pulled = await pullFromSupabase(deviceId ?? "", userId);
        if (pulled) {
          mergeFromRemote(
            pulled.sessions,
            pulled.earnedBadgeIds,
            pulled.profile,
          );
        }

        return;
      }

      // TOKEN_REFRESHED et autres événements — session valide, pas de re-vérification premium
      // setLoading(false) au cas où loading serait encore true (navigation SPA)
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
