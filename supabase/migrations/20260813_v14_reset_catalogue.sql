-- Migration : reset du catalogue et retrait des sous-systèmes v1.0 (pivot v1.4)
-- Date : 2026-08-13
-- Révisée : 2026-08-22
--
-- Contexte : la v1.4 est un retour à une base plus simple pour un dev solo.
-- Cette migration retire les tables/colonnes des fonctionnalités supprimées
-- côté code dans ce même sprint (multijoueur, défi quotidien, objectifs &
-- rapports PDF), ainsi qu'une colonne obsolète sur `questions`.
--
-- ⚠️  Révision 2026-08-22 : le TRUNCATE TABLE questions initialement prévu
-- ici a été RETIRÉ. Au moment de la rédaction (13 août), les 2 000 questions
-- v1.4 n'existaient pas encore et TRUNCATE visait à purger l'ancien
-- catalogue v1.0 (~22 700 questions). Depuis, les 2 000 questions v1.4
-- (5 catégories × FR/EN × 200) ont été générées et importées via
-- scripts/migrate-questions.ts — TRUNCATE les détruirait. Si l'ancien
-- catalogue v1.0 traîne encore en DB à côté des nouvelles, le purger
-- nécessite un DELETE ciblé (WHERE category NOT IN (...5 slugs v1.4...)),
-- pas un TRUNCATE — à rédiger séparément si besoin, après vérification de
-- ce qui reste réellement en base.
--
-- ⚠️  La section RLS "retrait du freemium par catégorie" initialement prévue
-- ici a également été RETIRÉE et reportée à Sprint 3 (Trial 7 jours), pour
-- ne pas verrouiller la lecture des questions à `subscriptions.status IN
-- ('active','trialing')` avant que le trial automatique n'existe.
--
-- Rédigée par l'agent, exécutée manuellement par Johan (aucune exécution
-- automatique — cf. context/ai-interaction.md, accord explicite requis
-- avant toute modification de schéma Supabase).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Colonne subcategory (héritage Mythology, supprimée)
-- ─────────────────────────────────────────────────────────────────────────

-- Colonne subcategory : n'existait que pour la hiérarchie Mythology (supprimée).
-- Retire aussi l'index dédié créé par 20260403_add_subcategory_to_questions.sql.
DROP INDEX IF EXISTS questions_subcategory_idx;

ALTER TABLE questions
  DROP COLUMN IF EXISTS subcategory;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Suppression du multijoueur
-- ─────────────────────────────────────────────────────────────────────────
-- DROP TABLE ... CASCADE retire aussi les policies RLS et index associés.

DROP TABLE IF EXISTS challenges CASCADE;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Retrait des objectifs / rapports PDF sur admin_settings
-- ─────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_admin_settings_report_schedule;

ALTER TABLE admin_settings
  DROP COLUMN IF EXISTS daily_goal,
  DROP COLUMN IF EXISTS report_schedule;
