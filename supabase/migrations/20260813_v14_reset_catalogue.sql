-- Migration : reset du catalogue et retrait des sous-systèmes v1.0 (pivot v1.4)
-- Date : 2026-08-13
--
-- Contexte : la v1.4 est un retour à une base plus simple pour un dev solo.
-- Cette migration purge le catalogue de questions v1.0 (21 catégories,
-- ~22 700 questions) et retire les tables/colonnes des fonctionnalités
-- supprimées côté code dans ce même sprint (multijoueur, défi quotidien,
-- objectifs & rapports PDF).
--
-- ⚠️  DESTRUCTIF — TRUNCATE + DROP. À exécuter uniquement après relecture,
-- sur une base dont le catalogue v1.0 n'a plus d'usage (les 2 000 questions
-- v1.4 ne sont pas encore produites : l'app tournera sans contenu jusqu'à
-- leur import via scripts/migrate-questions.ts).
--
-- Rédigée par l'agent, exécutée manuellement par Johan (aucune exécution
-- automatique — cf. context/ai-interaction.md, accord explicite requis
-- avant toute modification de schéma Supabase).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Purge du catalogue de questions
-- ─────────────────────────────────────────────────────────────────────────

TRUNCATE TABLE questions;

-- Colonne subcategory : n'existait que pour la hiérarchie Mythology (supprimée).
-- Retire aussi l'index dédié créé par 20260403_add_subcategory_to_questions.sql.
DROP INDEX IF EXISTS questions_subcategory_idx;

ALTER TABLE questions
  DROP COLUMN IF EXISTS subcategory;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. RLS questions : retrait du freemium par catégorie
-- ─────────────────────────────────────────────────────────────────────────
--
-- Le modèle v1.0 gate par LISTE de catégories gratuites (sciences, histoire,
-- heroes, animaux-nature + mythology/greco-roman). La v1.4 l'abandonne au
-- profit d'un accès uniforme aux 5 catégories, conditionné à un essai actif
-- ou un abonnement payant.
--
-- ⚠️  LIMITE CONNUE : le schéma actuel n'a PAS de colonne trial_ends_at (ni sur
-- profiles, ni ailleurs) — le cahier des charges v1.4 §5 prévoit un essai de
-- 7 jours démarré automatiquement à la création du profil, ce qui n'existe
-- pas encore. Cette policy se base donc uniquement sur `subscriptions.status`
-- (qui inclut déjà 'trialing' pour un essai Stripe classique). L'essai
-- automatique à la création de profil est un chantier Sprint 2 à part entière
-- (ajout probable d'une colonne sur `profiles`) et nécessitera un nouvel
-- accord explicite avant toute migration de schéma — non traité ici.

-- Retire les 3 policies SELECT accumulées par les migrations v1.0
-- (freemium par catégorie + exception greco-roman pour mythology).
DROP POLICY IF EXISTS "questions_read_free"             ON questions;
DROP POLICY IF EXISTS "questions_read_premium"           ON questions;
DROP POLICY IF EXISTS "free_and_myth_grecoRoman_read"    ON questions;

-- Lecture autorisée à tout utilisateur authentifié ayant un abonnement
-- actif ou en période d'essai (Stripe). Pas de policy anon : l'app v1.4
-- ne propose plus d'aperçu gratuit par catégorie.
CREATE POLICY "questions_read_active_access"
  ON questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = auth.uid()
        AND status   IN ('active', 'trialing')
    )
  );

-- Écriture toujours réservée au service role (scripts/migrate-questions.ts).

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Suppression du multijoueur
-- ─────────────────────────────────────────────────────────────────────────
-- DROP TABLE ... CASCADE retire aussi les policies RLS et index associés.

DROP TABLE IF EXISTS challenges CASCADE;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Retrait des objectifs / rapports PDF sur admin_settings
-- ─────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_admin_settings_report_schedule;

ALTER TABLE admin_settings
  DROP COLUMN IF EXISTS daily_goal,
  DROP COLUMN IF EXISTS report_schedule;
