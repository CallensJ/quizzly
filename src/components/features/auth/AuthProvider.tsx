"use client";

/**
 * src/components/features/auth/AuthProvider.tsx
 *
 * Source unique de vérité pour isPremium, accessStatus et authStore.loading.
 * L'accès combine deux chemins indépendants (resolveAccess ci-dessous) :
 * abonnement Stripe (`subscriptions`) OU essai gratuit 7 jours sans carte
 * (`account_trials`, cahier-des-charges-claude-v1.4.md §5).
 *
 * Pourquoi getSession() est supprimé :
 *   onAuthStateChange émet INITIAL_SESSION au premier montage avec
 *   la session persistée — getSession() en parallèle créait une race
 *   condition où setLoading(false) était appelé avant checkAccess().
 *
 * setLoading(false) est posé APRÈS confirmation du statut d'accès
 * pour éviter le flash "catégories verrouillées" au F5.
 *
 * pullFromSupabase est appelé sur INITIAL_SESSION ET SIGNED_IN
 * pour garantir le sync cross-device même si la session est déjà persistée.
 */

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useAuthStore, type AccessStatus } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { pullFromSupabase, linkProfileToAuthUser, syncProfile } from "@/lib/sync";
import { useOnlineSync } from "@/hooks/useOnlineSync";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

export interface AccessResolution {
  isPremium: boolean;
  accessStatus: AccessStatus;
  trialEndsAt: string | null;
}

/**
 * Résout le statut d'accès d'un compte : abonnement Stripe actif/en essai,
 * OU essai gratuit indépendant (account_trials, cahier v1.4 §5), OU aucun accès.
 * Interroge les deux tables en parallèle. Retourne null en cas d'erreur DB —
 * laisse l'appelant décider de retenter (cf. checkAccess sur INITIAL_SESSION).
 *
 * Exportée (en plus d'être utilisée en interne) pour être testée unitairement
 * sans monter le composant React — cf. `__tests__/AuthProvider.test.ts`.
 */
export async function resolveAccess(userId: string): Promise<AccessResolution | null> {
  const [
    { data: sub, error: subError },
    { data: trial, error: trialError },
  ] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("user_id", userId).maybeSingle(),
    supabase.from("account_trials").select("trial_ends_at").eq("user_id", userId).maybeSingle(),
  ]);

  if (subError || trialError) return null;

  if (sub?.status === "active" || sub?.status === "trialing") {
    return { isPremium: true, accessStatus: "premium", trialEndsAt: null };
  }

  const trialActive = !!trial?.trial_ends_at && new Date(trial.trial_ends_at).getTime() > Date.now();
  if (trialActive) {
    return { isPremium: true, accessStatus: "trial", trialEndsAt: trial!.trial_ends_at };
  }

  return { isPremium: false, accessStatus: "expired", trialEndsAt: null };
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setIsPremium = useAuthStore((s) => s.setIsPremium);
  const setAccessStatus = useAuthStore((s) => s.setAccessStatus);

  useOnlineSync();

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

      // ── Helper partagé : sync cross-device (tous comptes authentifiés) ──
      // Un compte parent connecté = sync active, gratuit ou premium.
      // Les features premium portent sur le contenu, pas sur la portabilité.
      async function syncOnLogin() {
        const { deviceId, profiles, mergeFromRemote } = useProfileStore.getState();

        // Upsert TOUS les profils avec auth_user_id inclus — une seule opération
        for (const p of profiles) {
          await syncProfile(deviceId ?? '', p, null, userId);
        }

        const pulled = await pullFromSupabase(deviceId ?? "", userId);
        if (pulled) {
          mergeFromRemote(
            pulled.sessions,
            pulled.earnedBadgeIds,
            pulled.profiles,
          );
        }
      }

      // ── INITIAL_SESSION : F5 / navigation directe ──────────────────────
      // setLoading(false) posé APRÈS checkAccess — jamais avant
      // Pull cross-device inclus : session déjà persistée → SIGNED_IN
      // ne se réémettra pas sur mobile
      if (event === "INITIAL_SESSION") {
        let retries = 0;

        async function checkAccess() {
          const resolved = await resolveAccess(userId);

          if (resolved) {
            setIsPremium(resolved.isPremium);
            setAccessStatus(resolved.accessStatus, resolved.trialEndsAt);
            setLoading(false);
            await syncOnLogin();
            return;
          }

          // Erreur DB sur l'une des deux requêtes → retry
          if (retries < MAX_RETRIES) {
            retries++;
            setTimeout(checkAccess, RETRY_DELAY_MS);
            return;
          }

          // Tous les retries épuisés → débloquer l'UI quand même
          setIsPremium(false);
          setAccessStatus("expired", null);
          setLoading(false);
        }

        await checkAccess();
        return;
      }

      // ── SIGNED_IN : connexion active (login explicite) ─────────────────
      if (event === "SIGNED_IN") {
        const resolved = await resolveAccess(userId);

        setIsPremium(resolved?.isPremium ?? false);
        setAccessStatus(resolved?.accessStatus ?? "expired", resolved?.trialEndsAt ?? null);
        setLoading(false);
        await syncOnLogin();
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
