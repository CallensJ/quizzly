"use client";

/**
 * src/components/features/auth/AuthProvider.tsx
 *
 * Source unique de vérité pour isPremium et authStore.loading.
 *
 * Pourquoi getSession() est supprimé :
 *   onAuthStateChange émet INITIAL_SESSION au premier montage avec
 *   la session persistée — getSession() en parallèle créait une race
 *   condition où setLoading(false) était appelé avant checkPremium().
 *
 * setLoading(false) est posé APRÈS confirmation du statut premium
 * pour éviter le flash "catégories verrouillées" au F5.
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
      // Pas de session → reset complet
      if (!session) {
        clearAuth(); // setLoading(false) + isPremium: false inclus
        return;
      }

      setSession(session);
      const userId = session.user.id;

      // INITIAL_SESSION : premier chargement (F5, navigation directe)
      // setLoading(false) posé APRÈS checkPremium — jamais avant
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
            setLoading(false);
            return;
          }

          // Pas premium, pas d'erreur DB → résultat définitif
          if (!error) {
            setIsPremium(false);
            setLoading(false);
            return;
          }

          // Erreur DB → retry
          if (retries < MAX_RETRIES) {
            retries++;
            setTimeout(checkPremium, RETRY_DELAY_MS);
            return;
          }

          // Tous les retries épuisés → débloquer l'UI quand même
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

      // TOKEN_REFRESHED et autres events — session valide
      // setLoading(false) au cas où loading serait encore true
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
