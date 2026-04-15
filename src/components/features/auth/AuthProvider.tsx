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
 *
 * pullFromSupabase est appelé sur INITIAL_SESSION ET SIGNED_IN
 * pour garantir le sync cross-device même si la session est déjà persistée.
 */

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseBrowser";
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
    // Timeout de sécurité : débloque l'UI si onAuthStateChange n'émet pas
    // dans les 5s (ex. Supabase inaccessible, réseau lent au démarrage)
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Pas de session → reset complet
      if (!session) {
        clearAuth();
        return;
      }

      setSession(session);
      const userId = session.user.id;

      // ── Helper partagé : pull cross-device si premium ──────────────────
      async function syncIfPremium(isPremium: boolean) {
        if (!isPremium) return;
        const { deviceId, mergeFromRemote } = useProfileStore.getState();
        if (deviceId) {
          await linkProfileToAuthUser(deviceId, userId);
        }
        const pulled = await pullFromSupabase(deviceId ?? "", userId);
        if (pulled) {
          mergeFromRemote(
            pulled.sessions,
            pulled.earnedBadgeIds,
            pulled.profile,
          );
        }
      }

      // ── INITIAL_SESSION : F5 / navigation directe ──────────────────────
      // setLoading(false) posé APRÈS checkPremium — jamais avant
      // Pull cross-device inclus : session déjà persistée → SIGNED_IN
      // ne se réémettra pas sur mobile
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
            await syncIfPremium(true);
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

      // ── SIGNED_IN : connexion active (login explicite) ─────────────────
      if (event === "SIGNED_IN") {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", userId)
          .maybeSingle();

        const isPremium =
          sub?.status === "active" || sub?.status === "trialing";

        setIsPremium(isPremium);
        setLoading(false);
        await syncIfPremium(isPremium);
        return;
      }

      // ── TOKEN_REFRESHED et autres events ──────────────────────────────
      // Session valide — setLoading(false) au cas où loading serait encore true
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
