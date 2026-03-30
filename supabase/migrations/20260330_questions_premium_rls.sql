-- Migration : RLS table questions — protection contenu premium
-- Date : 2026-03-30
--
-- Stratégie double protection (client + serveur) :
--   - Catégories gratuites (sciences, histoire, heroes) → lecture publique (anon + auth)
--   - Catégories premium (toutes les autres) → lecture réservée aux abonnés actifs
--     (status 'active' ou 'trialing' dans la table subscriptions)
--
-- Le client Supabase JS inclut automatiquement le JWT de session dans les requêtes.
-- Si le JWT est absent (anon) → les questions premium retournent 0 lignes.
-- Double protection : le gate côté client + cette RLS côté serveur.

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Supprime les anciennes policies permissives si elles existent
DROP POLICY IF EXISTS "Allow public read access" ON questions;
DROP POLICY IF EXISTS "questions_read_public"    ON questions;
DROP POLICY IF EXISTS "questions_select_anon"    ON questions;
DROP POLICY IF EXISTS "questions_select"         ON questions;

-- Catégories gratuites — lecture publique sans restriction
CREATE POLICY "questions_read_free"
  ON questions FOR SELECT
  TO anon, authenticated
  USING (
    category IN ('sciences', 'histoire', 'heroes', 'animaux-nature')
  );

-- Catégories premium — lecture uniquement si abonnement actif
-- auth.uid() IS NOT NULL garantit que l'utilisateur est authentifié
CREATE POLICY "questions_read_premium"
  ON questions FOR SELECT
  TO authenticated
  USING (
    category NOT IN ('sciences', 'histoire', 'heroes', 'animaux-nature')
    AND EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id  = auth.uid()
        AND status   IN ('active', 'trialing')
    )
  );

-- Écriture réservée au service role (migration de questions via script)
-- Pas de policy INSERT/UPDATE/DELETE pour anon/authenticated
