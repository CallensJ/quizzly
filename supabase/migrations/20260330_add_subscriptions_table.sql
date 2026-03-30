-- Migration : table subscriptions
-- Stocke les abonnements Stripe liés aux comptes Supabase Auth (adultes).
-- Mise à jour via webhook Stripe (service role — bypass RLS).

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT NOT NULL,
  stripe_subscription_id  TEXT NOT NULL UNIQUE,
  plan                    TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  -- Statuts Stripe : active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired
  status                  TEXT NOT NULL DEFAULT 'incomplete',
  current_period_end      TIMESTAMPTZ NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les lookups courants
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_idx ON subscriptions(stripe_customer_id);

-- updated_at automatique
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();

-- RLS : un utilisateur peut lire uniquement son propre abonnement
-- L'écriture est réservée au service role (webhook Stripe)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture abonnement personnel"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Pas de policy INSERT/UPDATE/DELETE pour les utilisateurs authentifiés
-- → seul le service role (webhook) peut écrire
