-- Migration : restriction RLS SELECT sur admin_settings (RGPD)
-- Date : 2026-05-15
--
-- CONTEXTE : la policy "admin_settings_select_anon" permettait à n'importe quel
-- client anonyme de lire la table admin_settings, incluant l'email parent
-- (stocké suite au consentement RGPD Art. 6.1.a). Violation directe du RGPD.
--
-- FIX : restreindre SELECT à TO authenticated uniquement.
-- Les opérations INSERT/UPDATE restent accessibles en anon pour la création
-- initiale des settings lors de l'onboarding parent (avant connexion).
-- La lecture n'est légitime que pour un parent authentifié.

DROP POLICY IF EXISTS "admin_settings_select_anon" ON admin_settings;

CREATE POLICY "admin_settings_select_auth"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
