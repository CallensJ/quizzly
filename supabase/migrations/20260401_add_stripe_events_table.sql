-- Migration : table stripe_events
-- Garantit l'idempotence du webhook Stripe.
-- Chaque event reçu est enregistré par son ID unique Stripe (evt_xxx).
-- Avant tout traitement, on vérifie que l'event n'a pas déjà été traité.
-- Écriture réservée au service role uniquement.

CREATE TABLE IF NOT EXISTS stripe_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id  TEXT NOT NULL UNIQUE,  -- ex: evt_1ABC...
  processed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les lookups rapides par event ID
CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_stripe_event_id_idx ON stripe_events(stripe_event_id);

-- RLS : aucun accès public — service role uniquement
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Pas de policy pour les utilisateurs authentifiés
-- → seul le service role (webhook) peut lire et écrire
