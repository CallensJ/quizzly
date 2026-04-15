'use client';

/**
 * src/hooks/useGoalNotification.ts
 *
 * Vérifie au démarrage si l'objectif journalier d'hier a été atteint.
 * Si non, envoie une notification email au parent via l'Edge Function notify-daily-goal.
 *
 * Conditions d'envoi :
 *   - adminEmail défini (parent configuré)
 *   - dailyGoal > 0 (objectif activé)
 *   - La notification n'a pas déjà été envoyée hier (lastGoalNotifDate)
 *   - Le score d'hier (somme des bonnes réponses) < dailyGoal
 *
 * Utilisation : monté une seule fois dans AuthProvider.
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { useProfileStore } from '@/stores/profileStore';

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function useGoalNotification(): void {
  useEffect(() => {
    const {
      adminEmail,
      dailyGoal,
      sessions,
      profile,
      lastGoalNotifDate,
      setLastGoalNotifDate,
    } = useProfileStore.getState();

    // Pré-conditions : email défini, objectif activé, profil présent
    if (!adminEmail || !dailyGoal || !profile) return;

    const yesterday = getYesterdayString();

    // Déjà notifié pour hier
    if (lastGoalNotifDate === yesterday) return;

    // Calcule les bonnes réponses d'hier (somme des scores de toutes les sessions)
    const yesterdayScore = sessions
      .filter((s) => s.playedAt.startsWith(yesterday))
      .reduce((sum, s) => sum + s.score, 0);

    // Objectif atteint — marque comme vérifié sans envoyer d'email
    if (yesterdayScore >= dailyGoal) {
      setLastGoalNotifDate(yesterday);
      return;
    }

    // Objectif non atteint — envoie la notification
    const locale = profile.locale ?? 'fr';

    supabase.functions
      .invoke('notify-daily-goal', {
        body: {
          email:        adminEmail,
          pseudo:       profile.pseudo,
          locale,
          goalTarget:   dailyGoal,
          goalAchieved: yesterdayScore,
          date:         yesterday,
        },
      })
      .then(() => {
        setLastGoalNotifDate(yesterday);
      })
      .catch(() => {
        // Échec réseau — réessaiera au prochain démarrage (lastGoalNotifDate non mis à jour)
      });
  }, []); // Exécuté une seule fois au montage
}
