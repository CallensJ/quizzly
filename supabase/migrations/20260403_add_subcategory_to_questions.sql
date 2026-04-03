-- Migration : ajout de la colonne subcategory à la table questions
-- Permet la hiérarchie parent/enfant pour Mythologie (et futures catégories parentes)
--
-- Structure :
--   category    = 'mythology'   (catégorie parente)
--   subcategory = 'egypt' | 'greco-roman' | 'nordic' | 'celtic' | 'amerindian' | 'asian' | 'african'
--
-- RLS mythology :
--   - 'greco-roman' : lecture publique (gratuit)
--   - Toutes les autres : lecture si abonnement actif (même règle que les autres catégories premium)

-- 1. Ajout colonne
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT NULL;

-- 2. Index pour les requêtes filtrées par sous-catégorie
CREATE INDEX IF NOT EXISTS questions_subcategory_idx ON questions (subcategory)
  WHERE subcategory IS NOT NULL;

-- 3. Mise à jour RLS : mythology greco-roman = lecture publique (gratuit)
--    Les autres sous-catégories de mythology suivent la règle premium existante.

-- Désactiver les politiques existantes sur mythology si elles existent
DROP POLICY IF EXISTS "mythology_public_read" ON questions;

-- Politique publique : questions gratuites OU mythology greco-roman
CREATE POLICY "free_and_myth_grecoRoman_read" ON questions
  FOR SELECT
  USING (
    -- Catégories gratuites historiques
    category IN ('sciences', 'histoire', 'heroes')
    OR
    -- Greco-roman : gratuit dans la hiérarchie mythology
    (category = 'mythology' AND subcategory = 'greco-roman')
  );

-- Note : la politique premium existante (subscriptions active/trialing) couvre
-- déjà les autres sous-catégories de mythology puisque category = 'mythology'
-- n'est pas dans la liste des catégories gratuites ci-dessus.
