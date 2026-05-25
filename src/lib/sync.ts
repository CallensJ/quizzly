/**
 * src/lib/sync.ts
 *
 * Couche de synchronisation locale ↔ Supabase.
 * Stratégie : local-first — Zustand/localStorage est la source de vérité.
 *
 * Identifiant de profil : local_profile_id (UUID Zustand du profil enfant).
 * Chaque enfant a sa propre ligne dans la table `profiles` (migration 20260525).
 *
 * Fonctions exportées :
 *   - syncProfile(deviceId, profile, dailyGoal, adminEmail)   — upsert profil + config admin
 *   - syncAdminSettings(profileId, dailyGoal, adminEmail)     — upsert config admin seule
 *   - syncSession(profileId, session)                         — insert session
 *   - syncBadge(profileId, badgeEarned, earnedBadgeIds)       — upsert badges
 *   - processOfflineQueue()                                   — rejoue les syncs en attente
 *   - linkProfileToAuthUser(profileId, authUserId)            — lie le profil au compte parent
 *   - pullFromSupabase(deviceId, authUserId?)                 — sync bidirectionnelle → local (premium only)
 */

import { supabase } from './supabaseBrowser';
import { getDB } from './db';
import type { Profile, QuizSession, Category, Difficulty } from '@/types';
import type { ReportSchedule } from './report';

// ─── Profil ───────────────────────────────────────────────────────────────────

/**
 * Upsert le profil dans Supabase.
 * Identifié par local_profile_id (UUID local du profil enfant).
 * Chaque enfant a sa propre ligne — N enfants par device sont supportés.
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
        .add({
          type: 'profile',
          deviceId,
          profileId: profile.id,
          payload: { profile, dailyGoal, adminEmail },
          createdAt: Date.now(),
        })
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
        local_profile_id: profile.id,                    // clé unique par enfant
        device_id:        deviceId,
        pseudo:           profile.pseudo,
        avatar_id:        profile.avatarId,
        avatar_style:     profile.avatarStyle ?? 'adventurer',
        locale:           profile.locale,
        age_group:        '6-11',
        created_at:       profile.createdAt,
        updated_at:       new Date().toISOString(),
      },
      { onConflict: 'local_profile_id' }
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
 * Upsert la config admin (objectif journalier + email adulte + consentement RGPD)
 * sans re-syncer le profil entier.
 *
 * profileId : UUID local du profil enfant actif (local_profile_id en DB).
 *
 * consent_email : true = consentement donné explicitement (RGPD Art. 6.1.a)
 * Si false, admin_email est effacé côté DB (null) — l'email ne peut pas être
 * stocké sans consentement.
 */
export async function syncAdminSettings(
  profileId: string,
  dailyGoal: number | null,
  adminEmail: string | null,
  reportSchedule?: ReportSchedule,
  emailConsent?: boolean
): Promise<void> {
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('local_profile_id', profileId)
      .maybeSingle();

    if (!profileRow) return;

    const consentGiven = emailConsent ?? false;
    const emailToStore = consentGiven ? adminEmail : null;

    await supabase
      .from('admin_settings')
      .upsert(
        {
          profile_id:          profileRow.id,
          daily_goal:          dailyGoal,
          admin_email:         emailToStore,
          consent_email:       consentGiven,
          consent_email_date:  consentGiven ? new Date().toISOString() : null,
          ...(reportSchedule !== undefined ? { report_schedule: reportSchedule } : {}),
          updated_at:          new Date().toISOString(),
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
 * profileId : UUID local du profil enfant actif.
 * En cas d'échec réseau, la session est ajoutée à la queue offline (Dexie).
 */
export async function syncSession(
  profileId: string,
  session: QuizSession
): Promise<void> {
  try {
    await _syncSessionCore(profileId, session);
  } catch {
    const db = getDB();
    if (db) {
      await db.pendingSyncs
        .add({ type: 'session', deviceId: profileId, profileId, payload: session, createdAt: Date.now() })
        .catch(() => {});
    }
  }
}

async function _syncSessionCore(profileId: string, session: QuizSession): Promise<void> {
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('local_profile_id', profileId)
    .maybeSingle();

  if (!profileRow) throw new Error('Profile not found');

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
 * profileId : UUID local du profil enfant actif.
 */
export async function syncBadge(
  profileId: string,
  badgeEarned: boolean,
  earnedBadgeIds: string[] = []
): Promise<void> {
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('local_profile_id', profileId)
      .maybeSingle();

    if (!profileRow) return;

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
 */
export async function processOfflineQueue(): Promise<void> {
  const db = getDB();
  if (!db) return;

  const pending = await db.pendingSyncs.toArray().catch(() => []);
  if (pending.length === 0) return;

  for (const item of pending) {
    try {
      if (item.type === 'session') {
        // profileId prioritaire sur deviceId (compatibilité items anciens)
        const pid = item.profileId ?? item.deviceId;
        await _syncSessionCore(pid, item.payload as QuizSession);
      } else if (item.type === 'profile') {
        const { profile, dailyGoal, adminEmail } = item.payload as {
          profile: Profile;
          dailyGoal: number | null;
          adminEmail: string | null;
        };
        await _syncProfileCore(item.deviceId, profile, dailyGoal, adminEmail);
      }
      if (item.id !== undefined) await db.pendingSyncs.delete(item.id);
    } catch {
      // Toujours en échec — laisse dans la queue
    }
  }
}

// ─── Nettoyage profil ────────────────────────────────────────────────────────

/**
 * Supprime sessions + badges d'un profil dans Supabase.
 * profileId : UUID local du profil enfant.
 */
export async function resetProfileDataInSupabase(profileId: string): Promise<void> {
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('local_profile_id', profileId)
      .maybeSingle();
    if (!profileRow) return;
    await supabase.from('sessions').delete().eq('profile_id', profileRow.id);
    await supabase.from('badges').delete().eq('profile_id', profileRow.id);
  } catch {
    // Silencieux — non critique
  }
}

/**
 * Délie un profil de son compte parent Supabase et efface ses sessions/badges.
 * profileId : UUID local du profil enfant.
 */
export async function unlinkAndCleanProfileFromSupabase(profileId: string): Promise<void> {
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('local_profile_id', profileId)
      .maybeSingle();
    if (!profileRow) return;
    await supabase.from('sessions').delete().eq('profile_id', profileRow.id);
    await supabase.from('badges').delete().eq('profile_id', profileRow.id);
    await supabase
      .from('profiles')
      .update({ auth_user_id: null })
      .eq('id', profileRow.id);
  } catch {
    // Silencieux — non critique
  }
}

// ─── Lien profil → compte parent ──────────────────────────────────────────────

/**
 * Lie le profil enfant au compte Supabase Auth du parent.
 * profileId : UUID local du profil enfant (local_profile_id en DB).
 */
export async function linkProfileToAuthUser(
  profileId: string,
  authUserId: string
): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ auth_user_id: authUserId })
      .eq('local_profile_id', profileId);
  } catch {
    // Échec silencieux — non critique
  }
}

// ─── Sync bidirectionnelle ────────────────────────────────────────────────────

export interface RemoteProfile {
  deviceId: string;
  pseudo: string;
  avatarId: string;
  avatarStyle: string;
  locale: string;
}

export interface PulledData {
  profiles: RemoteProfile[];
  sessions: QuizSession[];
  earnedBadgeIds: string[];
}

/**
 * Tire les données depuis Supabase → local. Réservé aux abonnés premium.
 *
 * Si authUserId est fourni, cherche tous les profils liés à ce compte parent
 * (sync cross-device). Sinon, fallback sur device_id (même appareil).
 */
export async function pullFromSupabase(
  deviceId: string,
  authUserId?: string
): Promise<PulledData | null> {
  try {
    const query = authUserId
      ? supabase.from('profiles').select('id, device_id, pseudo, avatar_id, avatar_style, locale').eq('auth_user_id', authUserId)
      : supabase.from('profiles').select('id, device_id, pseudo, avatar_id, avatar_style, locale').eq('device_id', deviceId).limit(1);

    const { data: profileRows } = await query;
    if (!profileRows || profileRows.length === 0) return null;

    const remoteProfiles: RemoteProfile[] = profileRows.map((r) => ({
      deviceId:    r.device_id,
      pseudo:      r.pseudo,
      avatarId:    r.avatar_id,
      avatarStyle: r.avatar_style ?? 'adventurer',
      locale:      r.locale,
    }));

    const profileIds = profileRows.map((r) => r.id);

    const { data: sessionRows } = await supabase
      .from('sessions')
      .select('category, difficulty, score, total, played_at')
      .in('profile_id', profileIds)
      .order('played_at', { ascending: false });

    const { data: badgeRows } = await supabase
      .from('badges')
      .select('earned_badge_ids')
      .in('profile_id', profileIds);

    const sessions: QuizSession[] = (sessionRows ?? []).map((row) => ({
      category:       row.category as Category,
      difficulty:     row.difficulty as Difficulty,
      score:          row.score,
      totalQuestions: row.total,
      playedAt:       row.played_at,
    }));

    const earnedBadgeIds: string[] = [
      ...new Set((badgeRows ?? []).flatMap((r) => r.earned_badge_ids ?? [])),
    ];

    return { profiles: remoteProfiles, sessions, earnedBadgeIds };
  } catch {
    return null;
  }
}
