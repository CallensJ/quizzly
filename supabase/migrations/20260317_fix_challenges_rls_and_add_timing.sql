-- Migration : Fix RLS UPDATE policy + colonnes timing (Mode Défi — MVP 4)
-- Date : 2026-03-17
--
-- 1) Correction du bug RLS silencieux :
--    La policy "challenges_update_complete" n'avait pas de WITH CHECK distinct.
--    PostgreSQL appliquait alors le USING comme WITH CHECK — après l'UPDATE,
--    la ligne résultante (status='completed', score_b!=NULL) échouait la vérification
--    → UPDATE rejeté silencieusement, challenge bloqué en 'pending'.
--    Fix : ajouter WITH CHECK (true) pour autoriser n'importe quel état résultant.
--
-- 2) Ajout du scoring basé sur le temps :
--    time_a / time_b = temps total de réponse en ms (questions répondues uniquement).
--    Utilisé comme départager en cas d'égalité de score.

-- ── 1. Fix RLS ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "challenges_update_complete" ON challenges;

CREATE POLICY "challenges_update_complete"
  ON challenges FOR UPDATE
  TO anon, authenticated
  -- USING : seuls les challenges encore en attente peuvent être mis à jour
  USING (status = 'pending' AND score_b IS NULL)
  -- WITH CHECK : la ligne résultante peut avoir n'importe quel état
  -- (sans cette clause, PostgreSQL réapplique USING sur la ligne après UPDATE
  --  → la ligne 'completed' échoue la vérification → UPDATE rejeté silencieusement)
  WITH CHECK (true);

-- ── 2. Ajout des colonnes timing ──────────────────────────────────────────────

ALTER TABLE challenges
  -- Temps total de réponse de Joueur A en ms (null = anciens challenges sans timing)
  ADD COLUMN IF NOT EXISTS time_a integer,
  -- Temps total de réponse de Joueur B en ms
  ADD COLUMN IF NOT EXISTS time_b integer;
