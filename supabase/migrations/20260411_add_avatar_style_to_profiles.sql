-- Migration : ajouter avatar_style dans profiles pour la sync cross-device premium.
--
-- Permet de restaurer l'avatar complet (style DiceBear) sur un nouvel appareil
-- lors de la connexion du compte parent premium.
--
-- Valeur par défaut : 'adventurer' (style gratuit — rétro-compat profils existants)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_style TEXT NOT NULL DEFAULT 'adventurer';
