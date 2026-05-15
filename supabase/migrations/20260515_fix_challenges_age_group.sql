-- Migration : correction de la valeur par défaut age_group dans challenges
-- Date : 2026-05-15
--
-- L'app a migré vers '6-11' (MVP 4, suppression tranche d'âge),
-- mais le DEFAULT dans la table challenges était resté à '6-9'.
-- challenges.ts hardcode déjà '6-11' côté client — on aligne la DB.

ALTER TABLE challenges
  ALTER COLUMN age_group SET DEFAULT '6-11';

-- Mise à jour des lignes existantes encore à '6-9'
UPDATE challenges
  SET age_group = '6-11'
  WHERE age_group = '6-9';
