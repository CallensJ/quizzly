-- Migration : ajoute earned_badge_ids à la table badges pour la sync bidirectionnelle
--
-- Contexte : la table badges ne stockait qu'un boolean badge_earned (MVP 1-3).
-- MVP 2 bidirectionnel : on stocke maintenant les IDs individuels pour pouvoir
-- recharger les badges depuis Supabase sur un nouvel appareil.
--
-- Rétro-compat : colonne nullable avec défaut tableau vide.

ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS earned_badge_ids text[] DEFAULT '{}';
