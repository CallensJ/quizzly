-- Migration : politiques RLS pour les tables profiles, admin_settings, sessions, badges
-- Date : 2026-03-24
--
-- Les profils Erudia sont identifiés par device_id (UUID local généré à l'onboarding).
-- Les enfants n'ont pas de compte Supabase Auth — l'accès anon est requis.
-- Politique permissive pour MVP 4 — à restreindre en MVP 5 avec auth enfant.

-- ─── profiles ─────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Lecture publique (pull depuis Supabase, sync sessions/badges)
CREATE POLICY "profiles_select_anon"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insertion publique (premier sync après onboarding)
CREATE POLICY "profiles_insert_anon"
  ON profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Mise à jour publique (sync profil modifié)
CREATE POLICY "profiles_update_anon"
  ON profiles FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ─── admin_settings ───────────────────────────────────────────────────────────

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_settings_select_anon"
  ON admin_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin_settings_insert_anon"
  ON admin_settings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admin_settings_update_anon"
  ON admin_settings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ─── sessions ─────────────────────────────────────────────────────────────────

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_anon"
  ON sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "sessions_insert_anon"
  ON sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─── badges ───────────────────────────────────────────────────────────────────

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_select_anon"
  ON badges FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "badges_insert_anon"
  ON badges FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "badges_update_anon"
  ON badges FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
