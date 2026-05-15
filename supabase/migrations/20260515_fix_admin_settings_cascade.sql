-- Migration : ajout ON DELETE CASCADE sur admin_settings.profile_id
-- Date : 2026-05-15
--
-- Sans CASCADE, supprimer un profil laissait ses admin_settings orphelines en base.
-- On recrée la contrainte FK avec CASCADE pour nettoyage automatique.

ALTER TABLE admin_settings
  DROP CONSTRAINT IF EXISTS admin_settings_profile_id_fkey;

ALTER TABLE admin_settings
  ADD CONSTRAINT admin_settings_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;
