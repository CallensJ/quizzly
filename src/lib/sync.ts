/**
 * src/lib/sync.ts
 *
 * Couche de synchronisation local → Supabase.
 * Stratégie : local-first — Zustand/localStorage est la source de vérité.
 * La sync est fire-and-forget (silencieuse en cas d'erreur réseau).
 *
 * Fonctions exportées :
 *   - syncProfile(deviceId, profile, dailyGoal, adminEmail) — upsert profil + config admin
 *   - syncAdminSettings(deviceId, dailyGoal, adminEmail)    — upsert config admin seule
 *   - syncSession(deviceId, session)                        — insert une session de quiz
 *   - syncBadge(deviceId, badgeEarned)                      — upsert statut badge
 */

import { supabase } from './supabase';
import type { Profile, QuizSession } from '@/types';
import type { ReportSchedule } from './report';

// ─── Profil ───────────────────────────────────────────────────────────────────

/**
 * Upsert le profil dans Supabase.
 * Identifié par device_id (UUID local généré à l'onboarding).
 * Si la connexion échoue, l'app continue normalement (local-first).
 */
export async function syncProfile(
  deviceId: string,
  profile: Profile,
  dailyGoal: number | null,
  adminEmail: string | null = null
): Promise<void> {
  try {
    // Upsert le profil (insert ou update si device_id existe déjà)
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          device_id: deviceId,
          pseudo: profile.pseudo,
          avatar_id: profile.avatarId,
          locale: profile.locale,
          created_at: profile.createdAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'device_id' }
      )
      .select('id')
      .single();

    if (profileError || !profileRow) return;

    // Upsert config admin (objectif journalier + email adulte)
    await supabase
      .from('admin_settings')
      .upsert(
        {
          profile_id: profileRow.id,
          daily_goal: dailyGoal,
          admin_email: adminEmail,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      );
  } catch {
    // Échec réseau — on continue silencieusement (local-first)
  }
}

// ─── Admin settings ───────────────────────────────────────────────────────────

/**
 * Upsert la config admin (objectif journalier + email adulte) sans re-syncer le profil entier.
 * Appelé depuis AdminScreen lors de la sauvegarde de l'email ou de l'objectif.
 */
export async function syncAdminSettings(
  deviceId: string,
  dailyGoal: number | null,
  adminEmail: string | null,
  reportSchedule?: ReportSchedule    // optionnel pour rétro-compat des anciens appelants
): Promise<void> {
  try {
    const { data: profileRow, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (error || !profileRow) return;

    await supabase
      .from('admin_settings')
      .upsert(
        {
          profile_id:      profileRow.id,
          daily_goal:      dailyGoal,
          admin_email:     adminEmail,
          // report_schedule inclus seulement si fourni — évite d'écraser la valeur existante
          ...(reportSchedule !== undefined ? { report_schedule: reportSchedule } : {}),
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      );
  } catch {
    // Échec réseau — silencieux
  }
}

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Insère une session de quiz dans Supabase après chaque partie.
 * Résout le profile_id depuis le device_id.
 */
export async function syncSession(
  deviceId: string,
  session: QuizSession
): Promise<void> {
  try {
    // Récupérer l'UUID Supabase du profil depuis le device_id
    const { data: profileRow, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (error || !profileRow) return;

    await supabase.from('sessions').insert({
      profile_id: profileRow.id,
      category: session.category,
      difficulty: session.difficulty,
      score: session.score,
      total: session.totalQuestions,
      played_at: session.playedAt,
    });
  } catch {
    // Échec réseau — silencieux
  }
}

// ─── Badge ────────────────────────────────────────────────────────────────────

/**
 * Upsert le statut badge du joueur dans Supabase.
 */
export async function syncBadge(
  deviceId: string,
  badgeEarned: boolean
): Promise<void> {
  try {
    const { data: profileRow, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (error || !profileRow) return;

    await supabase
      .from('badges')
      .upsert(
        {
          profile_id: profileRow.id,
          badge_earned: badgeEarned,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      );
  } catch {
    // Échec réseau — silencieux
  }
}
