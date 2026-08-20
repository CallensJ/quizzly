-- Migration : essai gratuit 7 jours indépendant de Stripe (account_trials)
-- Date : 2026-08-19
--
-- Contexte : cahier-des-charges-claude-v1.4.md §5 — 7 jours d'accès complet dès la
-- création du compte parent, sans carte bancaire. Stripe n'intervient qu'à la fin
-- de l'essai (checkout classique, déjà entièrement fonctionnel).
--
-- ⚠️  DÉPENDANCE : cette migration étend la policy `questions_read_active_access`
-- créée par 20260813_v14_reset_catalogue.sql — à appliquer uniquement APRÈS elle.
--
-- Rédigée par l'agent, exécutée manuellement par Johan (aucune exécution
-- automatique — cf. context/ai-interaction.md, accord explicite requis
-- avant toute modification de schéma Supabase).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Table account_trials — un essai par compte parent (auth.users)
-- ─────────────────────────────────────────────────────────────────────────
--
-- Table dédiée plutôt qu'un assouplissement de `subscriptions` : les colonnes
-- stripe_customer_id / stripe_subscription_id y sont NOT NULL précisément parce
-- que chaque ligne existante vient d'un vrai checkout Stripe. Mélanger les deux
-- concepts casserait cet invariant.

CREATE TABLE IF NOT EXISTS account_trials (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_ends_at TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE account_trials ENABLE ROW LEVEL SECURITY;

-- Lecture de son propre essai uniquement.
CREATE POLICY "account_trials_read_own"
  ON account_trials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Pas de policy INSERT/UPDATE/DELETE pour authenticated — seul le trigger
-- ci-dessous (SECURITY DEFINER) peut écrire dans cette table.

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Trigger — démarre l'essai à la création du compte
-- ─────────────────────────────────────────────────────────────────────────
--
-- Se déclenche à l'INSERT dans auth.users, quelle que soit la méthode de
-- signup (email/mot de passe ou Google OAuth — les deux y insèrent une ligne).
-- Le compte existe dès l'appel signUp(), avant même la confirmation par email :
-- l'essai démarre immédiatement, la confirmation n'entame pas les 7 jours.

CREATE OR REPLACE FUNCTION handle_new_user_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO account_trials (user_id, trial_ends_at)
  VALUES (NEW.id, NOW() + INTERVAL '7 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_start_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_trial();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. RLS questions — ajoute l'essai comme second chemin d'accès
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "questions_read_active_access" ON questions;

CREATE POLICY "questions_read_active_access"
  ON questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = auth.uid()
        AND status   IN ('active', 'trialing')
    )
    OR
    EXISTS (
      SELECT 1 FROM account_trials
      WHERE user_id = auth.uid()
        AND trial_ends_at > NOW()
    )
  );
