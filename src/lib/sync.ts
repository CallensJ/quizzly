/**
 * src/lib/sync.ts
 *
 * Couche de synchronisation locale ↔ Supabase.
 * Stratégie : local-first — Zustand/localStorage est la source de vérité.
 *
 * Fonctions exportées :
 *   - syncProfile(deviceId, profile, dailyGoal, adminEmail) — upsert profil + config admin
 *   - syncAdminSettings(deviceId, dailyGoal, adminEmail)    — upsert config admin seule
 *   - syncSession(deviceId, session)                        — insert session (avec queue offline)
 *   - syncBadge(deviceId, badgeEarned, earnedBadgeIds)      — upsert badges
 *   - processOfflineQueue()                                 — rejoue les syncs en attente
 *   - pullFromSupabase(deviceId)                            — sync bidirectionnelle → local
 */

import { supabase } from './supabase';
import { getDB } from './db';
import type { Profile, QuizSession, Category, Difficulty } from '@/types';
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
    await _syncProfileCore(deviceId, profile, dailyGoal, adminEmail);
  } catch {
    // Échec réseau — ajout à la queue offline pour retry
    const db = getDB();
    if (db) {
      await db.pendingSyncs
        .add({ type: 'profile', deviceId, payload: { profile, dailyGoal, adminEmail }, createdAt: Date.now() })
        .catch(() => {});
    }
  }
}

async function _syncProfileCore(
  deviceId: string,
  profile: Profile,
  dailyGoal: number | null,
  adminEmail: string | null
): Promise<void> {
  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        device_id:   deviceId,
        pseudo:      profile.pseudo,
        avatar_id:   profile.avatarId,
        locale:      profile.locale,
        created_at:  profile.createdAt,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'device_id' }
    )
    .select('id')
    .single();

  if (profileError || !profileRow) throw new Error(profileError?.message ?? 'Profile upsert failed');

  await supabase
    .from('admin_settings')
    .upsert(
      {
        profile_id:  profileRow.id,
        daily_goal:  dailyGoal,
        admin_email: adminEmail,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'profile_id' }
    );
}

// ─── Admin settings ───────────────────────────────────────────────────────────

/**
 * Upsert la config admin (objectif journalier + email adulte) sans re-syncer le profil entier.
 */
export async function syncAdminSettings(
  deviceId: string,
  dailyGoal: number | null,
  adminEmail: string | null,
  reportSchedule?: ReportSchedule
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
          profile_id:   profileRow.id,
          daily_goal:   dailyGoal,
          admin_email:  adminEmail,
          ...(reportSchedule !== undefined ? { report_schedule: reportSchedule } : {}),
          updated_at:   new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      );
  } catch {
    // Échec réseau — silencieux (admin settings non critiques)
  }
}

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Insère une session de quiz dans Supabase.
 * En cas d'échec réseau, la session est ajoutée à la queue offline (Dexie)
 * et sera rejouée au prochain retour de connexion.
 */
export async function syncSession(
  deviceId: string,
  session: QuizSession
): Promise<void> {
  try {
    await _syncSessionCore(deviceId, session);
  } catch {
    // Offline ou erreur réseau — mise en queue pour retry
    const db = getDB();
    if (db) {
      await db.pendingSyncs
        .add({ type: 'session', deviceId, payload: session, createdAt: Date.now() })
        .catch(() => {});
    }
  }
}

async function _syncSessionCore(deviceId: string, session: QuizSession): Promise<void> {
  const { data: profileRow, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('device_id', deviceId)
    .single();

  if (error || !profileRow) throw new Error('Profile not found');

  const { error: insertError } = await supabase.from('sessions').insert({
    profile_id: profileRow.id,
    category:   session.category,
    difficulty: session.difficulty,
    score:      session.score,
    total:      session.totalQuestions,
    played_at:  session.playedAt,
  });

  if (insertError) throw new Error(insertError.message);
}

// ─── Badge ────────────────────────────────────────────────────────────────────

/**
 * Upsert le statut badge du joueur dans Supabase.
 * Stocke également les IDs individuels pour la sync bidirectionnelle.
 */
export async function syncBadge(
  deviceId: string,
  badgeEarned: boolean,
  earnedBadgeIds: string[] = []
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
          profile_id:       profileRow.id,
          badge_earned:     badgeEarned,
          earned_badge_ids: earnedBadgeIds,
          updated_at:       new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      );
  } catch {
    // Échec réseau — silencieux
  }
}

// ─── Queue offline ────────────────────────────────────────────────────────────

/**
 * Rejoue toutes les syncs en attente dans la queue Dexie.
 * Appelé automatiquement au retour de connexion (hook useOnlineSync).
 * Les items traités avec succès sont supprimés de la queue.
 */
export async function processOfflineQueue(): Promise<void> {
  const db = getDB();
  if (!db) return;

  const pending = await db.pendingSyncs.toArray().catch(() => []);
  if (pending.length === 0) return;

  for (const item of pending) {
    try {
      if (item.type === 'session') {
        await _syncSessionCore(item.deviceId, item.payload as QuizSession);
      } else if (item.type === 'profile') {
        const { profile, dailyGoal, adminEmail } = item.payload as {
          profile: Profile;
          dailyGoal: number | null;
          adminEmail: string | null;
        };
        await _syncProfileCore(item.deviceId, profile, dailyGoal, adminEmail);
      }
      // Succès — supprime l'item de la queue
      if (item.id !== undefined) await db.pendingSyncs.delete(item.id);
    } catch {
      // Toujours en échec — laisse dans la queue pour la prochaine reconnexion
    }
  }
}

// ─── Sync bidirectionnelle ────────────────────────────────────────────────────

export interface PulledData {
  sessions: QuizSession[];
  earnedBadgeIds: string[];
}

/**
 * Tire les données depuis Supabase → local.
 * Appelé à la connexion du parent (SIGNED_IN) pour fusionner
 * les données cloud dans le store local (multi-device).
 *
 * Les sessions sont limitées aux 50 dernières pour éviter les volumes excessifs.
 * earnedBadgeIds sont chargés depuis la colonne earned_badge_ids (migration 20260322).
 *
 * Retourne null si le device_id n'a pas encore de profil en base.
 */
export async function pullFromSupabase(deviceId: string): Promise<PulledData | null> {
  try {
    const { data: profileRow, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (error || !profileRow) return null;

    // Sessions — 50 dernières, ordre chronologique inverse
    const { data: sessionRows } = await supabase
      .from('sessions')
      .select('category, difficulty, score, total, played_at')
      .eq('profile_id', profileRow.id)
      .order('played_at', { ascending: false })
      .limit(50);

    // Badges — earned_badge_ids (ajouté en migration 20260322)
    const { data: badgeRow } = await supabase
      .from('badges')
      .select('earned_badge_ids')
      .eq('profile_id', profileRow.id)
      .single();

    const sessions: QuizSession[] = (sessionRows ?? []).map((row) => ({
      category:       row.category as Category,
      difficulty:     row.difficulty as Difficulty,
      score:          row.score,
      totalQuestions: row.total,
      playedAt:       row.played_at,
    }));

    const earnedBadgeIds: string[] = badgeRow?.earned_badge_ids ?? [];

    return { sessions, earnedBadgeIds };
  } catch {
    return null;
  }
}
