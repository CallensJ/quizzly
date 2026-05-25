-- Migration : un profil enfant = une ligne dans profiles
--
-- Avant : device_id UNIQUE → une ligne par appareil, multi-profils non synchronisés.
-- Après : local_profile_id UUID UNIQUE → une ligne par enfant, cross-device complet.
--
-- Rétro-compat : les lignes existantes (sans local_profile_id) restent valides.
-- La contrainte UNIQUE device_id est supprimée pour autoriser N enfants par appareil.

-- 1. Supprime la contrainte UNIQUE sur device_id (remplacée par local_profile_id)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_device_id_key;

-- 2. Ajoute la colonne identifiant le profil enfant local (UUID Zustand)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS local_profile_id UUID;

-- 3. Index unique partiel (NULL autorisé pour les anciennes lignes)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_local_profile_id_key
  ON public.profiles(local_profile_id)
  WHERE local_profile_id IS NOT NULL;
