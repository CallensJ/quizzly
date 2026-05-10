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
 *   - linkProfileToAuthUser(deviceId, authUserId)           — lie le profil au compte parent
 *   - pullFromSupabase(deviceId, authUserId?)               — sync bidirectionnelle → local (premium only)
 */

import { supabase } from './supabaseBrowser';
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
        device_id:    deviceId,
        pseudo:       profile.pseudo,
        avatar_id:    profile.avatarId,
        avatar_style: profile.avatarStyle ?? 'adventurer',
        locale:       profile.locale,
        age_group:    '6-11', // supprimé de l'app MVP 4, hardcodé pour rétro-compat Supabase
        created_at:   profile.createdAt,
        updated_at:   new Date().toISOString(),
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
 * Upsert la config admin (objectif journalier + email adulte + consentement RGPD)
 * sans re-syncer le profil entier.
 *
 * consent_email : true = consentement donné explicitement (RGPD Art. 6.1.a)
 * Si false, admin_email est effacé côté DB (null) — l'email ne peut pas être
 * stocké sans consentement.
 */
export async function syncAdminSettings(
  deviceId: string,
  dailyGoal: number | null,
  adminEmail: string | null,
  reportSchedule?: ReportSchedule,
  emailConsent?: boolean
): Promise<void> {
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (!profileRow) return;

    // Si le consentement est explicitement retiré, on efface l'email en DB
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
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('device_id', deviceId)
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
 * Stocke également les IDs individuels pour la sync bidirectionnelle.
 */
export async function syncBadge(
  deviceId: string,
  badgeEarned: boolean,
  earnedBadgeIds: string[] = []
): Promise<void> {
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId)
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

// ─── Nettoyage profil ────────────────────────────────────────────────────────

/**
 * Supprime sessions + badges d'un profil dans Supabase.
 * Appelé après resetProgress() local pour éviter que pullFromSupabase
 * restaure la progression effacée au prochain F5.
 */
export async function resetProfileDataInSupabase(deviceId: string): Promise<void> {
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId)
      .maybeSingle();
    if (!profileRow) return;
    await supabase.from('sessions').delete().eq('profile_id', profileRow.id);
    await supabase.from('badges').delete().eq('profile_id', profileRow.id);
  } catch {
    // Silencieux — non critique
  }
}

/**
 * Délie le profil de son compte parent Supabase et efface ses sessions/badges.
 * Appelé avant la suppression locale d'un profil pour empêcher pullFromSupabase
 * de le restaurer au prochain F5 (Cas 1 : profile null → recréation cloud).
 */
export async function unlinkAndCleanProfileFromSupabase(deviceId: string): Promise<void> {
  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId)
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
 * Lie le profil du device au compte Supabase Auth du parent.
 * Appelé à chaque SIGNED_IN pour maintenir le lien à jour.
 * Permet la restauration cross-device en mode premium.
 */
export async function linkProfileToAuthUser(
  deviceId: string,
  authUserId: string
): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ auth_user_id: authUserId })
      .eq('device_id', deviceId);
  } catch {
    // Échec silencieux — non critique
  }
}

// ─── Sync bidirectionnelle ────────────────────────────────────────────────────

// Identité profil enfant tirée du cloud
export interface RemoteProfile {
  pseudo: string;
  avatarId: string;
  avatarStyle: string;
  locale: string;
}

export interface PulledData {
  profile: RemoteProfile | null;
  sessions: QuizSession[];
  earnedBadgeIds: string[];
}

/**
 * Tire les données depuis Supabase → local. Réservé aux abonnés premium.
 *
 * Si authUserId est fourni, cherche tous les profils liés à ce compte parent
 * (sync cross-device). Sinon, fallback sur device_id (même appareil).
 *
 * Retourne null si aucun profil trouvé.
 *
 * Sync complète : pseudo, avatar, locale, sessions, badges.
 */
export async function pullFromSupabase(
  deviceId: string,
  authUserId?: string
): Promise<PulledData | null> {
  try {
    // Cherche le(s) profil(s) — par auth_user_id si dispo, sinon device_id
    const query = authUserId
      ? supabase.from('profiles').select('id, pseudo, avatar_id, avatar_style, locale').eq('auth_user_id', authUserId)
      : supabase.from('profiles').select('id, pseudo, avatar_id, avatar_style, locale').eq('device_id', deviceId).limit(1);

    const { data: profileRows } = await query;
    if (!profileRows || profileRows.length === 0) return null;

    // Profil de référence : le premier trouvé (compte parent → un profil enfant principal)
    const mainProfileRow = profileRows[0];
    const remoteProfile: RemoteProfile = {
      pseudo:      mainProfileRow.pseudo,
      avatarId:    mainProfileRow.avatar_id,
      avatarStyle: mainProfileRow.avatar_style ?? 'adventurer',
      locale:      mainProfileRow.locale,
    };

    const profileIds = profileRows.map((r) => r.id);

    // Sessions — historique complet pour tous les profils du parent
    const { data: sessionRows } = await supabase
      .from('sessions')
      .select('category, difficulty, score, total, played_at')
      .in('profile_id', profileIds)
      .order('played_at', { ascending: false });

    // Badges — union de tous les profils
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

    return { profile: remoteProfile, sessions, earnedBadgeIds };
  } catch {
    return null;
  }
}
