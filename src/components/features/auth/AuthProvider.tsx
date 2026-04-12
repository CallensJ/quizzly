"use client";

/**
 * src/components/features/auth/AuthProvider.tsx
 *
 * Composant wrapper qui initialise l'état auth Supabase au montage
 * et écoute les changements de session (onAuthStateChange).
 *
 * Responsabilités MVP 2+ :
 *   1. Initialise authStore depuis la session Supabase persistée (localStorage sb-*)
 *   2. Lance useOnlineSync : rejoue la queue offline au retour de connexion
 *   3. Sur SIGNED_IN : sync bidirectionnelle Supabase → local (sessions + badges)
 */

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { pullFromSupabase, linkProfileToAuthUser } from "@/lib/sync";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import { useGoalNotification } from "@/hooks/useGoalNotification";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setIsPremium = useAuthStore((s) => s.setIsPremium);

  // Rejoue la queue offline dès le retour de connexion
  useOnlineSync();
  // Vérifie au démarrage si l'objectif journalier d'hier a été atteint
  useGoalNotification();

  useEffect(() => {
    // Récupère la session active (persistée dans localStorage par supabase-js)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Écoute les événements auth (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED…)
    // INITIAL_SESSION : premier chargement (reload) — vérifie le statut premium
    // SIGNED_IN : connexion active — lien profil + sync premium cross-device
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setSession(session);

        // INITIAL_SESSION (reload) : vérifier le statut premium immédiatement
        if (event === "INITIAL_SESSION" && session.user) {
          let retries = 0;
          const maxRetries = 5;

          async function checkPremium() {
            const { data: sub } = await supabase
              .from("subscriptions")
              .select("status")
              .eq("user_id", session.user.id)
              .maybeSingle();

            const premium =
              sub?.status === "active" || sub?.status === "trialing";

            if (premium) {
              setIsPremium(true);
              return;
            }

            if (retries < maxRetries) {
              retries++;
              setTimeout(checkPremium, 1000);
            }
            // Ne pas forcer false ici — useSubscription requête indépendamment
            // et posera le statut définitif. Forcer false ici risque d'écraser
            // un état correct si le webhook Stripe arrive après les retries.
          }

          checkPremium();
        }

        // SIGNED_IN : lien profil → compte parent + sync premium cross-device
        if (event === "SIGNED_IN" && session.user) {
          const { deviceId, mergeFromRemote } = useProfileStore.getState();

          // Lier le profil au compte parent uniquement si un profil local existe déjà.
          // Sur un nouvel appareil (deviceId null), on saute cette étape — le lien
          // sera créé lors du prochain syncProfile (après restauration du profil).
          if (deviceId) {
            await linkProfileToAuthUser(deviceId, session.user.id);
          }

          // Pull uniquement pour les abonnés premium
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("status")
            .eq("user_id", session.user.id)
            .maybeSingle();

          const isPremium =
            sub?.status === "active" || sub?.status === "trialing";
          setIsPremium(isPremium); // cache immédiat — évite le flash au retour sur /home
          if (!isPremium) return;

          // Restauration cross-device complète : pseudo, avatar, locale, sessions, badges.
          // pullFromSupabase utilise authUserId en priorité — deviceId peut être null ici
          // (nouvel appareil sans profil local).
          const pulled = await pullFromSupabase(
            deviceId ?? "",
            session.user.id,
          );
          if (pulled) {
            mergeFromRemote(
              pulled.sessions,
              pulled.earnedBadgeIds,
              pulled.profile,
            );
          }
        }
      } else {
        clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading, clearAuth]);

  return <>{children}</>;
}
