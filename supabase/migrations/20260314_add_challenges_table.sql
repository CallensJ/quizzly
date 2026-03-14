-- Migration : table challenges (Mode Défi — MVP 4)
-- Date : 2026-03-14
--
-- Stocke les défis asynchrones entre joueurs.
-- Joueur A crée un challenge après son quiz, Joueur B le rejoint via un code 6 chars.
-- Les questions sont snapshotées en jsonb pour garantir la même partie aux deux joueurs.
-- Expiration automatique après 12h (expires_at).

CREATE TABLE IF NOT EXISTS challenges (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Code court partagé entre les joueurs (ex: "ZBRE7K")
  -- UNIQUE garantit l'absence de collision de code
  code          text        NOT NULL UNIQUE,

  -- Joueur A (créateur du challenge)
  created_by    text        NOT NULL,
  avatar_a      text,

  -- Configuration du quiz
  category      text        NOT NULL,
  difficulty    text        NOT NULL,
  locale        text        NOT NULL DEFAULT 'fr',
  age_group     text        NOT NULL DEFAULT '6-9',

  -- Snapshot des 20 questions jouées par A (même ordre garanti pour B)
  questions     jsonb       NOT NULL,

  score_a       integer     NOT NULL,
  total         integer     NOT NULL DEFAULT 20,

  -- Joueur B (null tant que le défi n'a pas été rejoint)
  challenged_by text,
  avatar_b      text,
  score_b       integer,
  winner        text        CHECK (winner IN ('a', 'b', 'draw')),

  -- Cycle de vie
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'completed', 'expired')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,       -- created_at + 12h
  completed_at  timestamptz
);

-- Index sur code (recherche fréquente via joinChallenge)
CREATE INDEX IF NOT EXISTS idx_challenges_code ON challenges (code);

-- Index pour l'historique par joueur (fetchMyChallenges)
CREATE INDEX IF NOT EXISTS idx_challenges_created_by   ON challenges (created_by);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged_by ON challenges (challenged_by);

-- RLS : chaque joueur peut lire/écrire ses propres challenges
-- Note : les profils Quizzly n'ont pas de auth.uid() lié (enfants sans compte).
-- On utilise une politique permissive pour MVP 4 — à restreindre en MVP 5 avec auth enfant.
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Lecture publique (anon peut lire un challenge par code pour le rejoindre)
CREATE POLICY "challenges_read_by_code"
  ON challenges FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insertion publique (création d'un challenge depuis le client)
CREATE POLICY "challenges_insert"
  ON challenges FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Mise à jour publique (Joueur B complète le challenge)
-- Restriction : uniquement si status = 'pending' et score_b IS NULL
CREATE POLICY "challenges_update_complete"
  ON challenges FOR UPDATE
  TO anon, authenticated
  USING (status = 'pending' AND score_b IS NULL);

-- ── Nettoyage automatique (pg_cron) ──────────────────────────────────────────
-- Supprime les challenges de plus de 7 jours (expired ou completed)
-- À activer via le dashboard Supabase → Database → Cron Jobs
--
-- SELECT cron.schedule(
--   'cleanup-challenges',
--   '0 3 * * *',   -- chaque nuit à 3h
--   $$DELETE FROM challenges WHERE created_at < now() - interval '7 days'$$
-- );
