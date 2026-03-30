-- Migration : lier les profils enfants au compte parent (Supabase Auth)
--
-- Ajoute auth_user_id dans profiles pour permettre la sync cross-device premium.
-- Un parent connecté peut ainsi restaurer tous ses profils enfants sur n'importe quel appareil.
--
-- Comportement :
--   - Gratuit  : pas de sync cross-device (auth_user_id stocké mais pull non déclenché)
--   - Premium  : pull complet de l'historique sur SIGNED_IN

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index pour les requêtes par auth_user_id (pull premium)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
