-- Migration : bilinguisme découplé — quiz_language sur profiles
-- Date : 2026-08-19
--
-- Contexte : cahier-des-charges-claude-v1.4.md §5. La langue de l'interface
-- (colonne `locale`, pilotée par le routing next-intl) et la langue du
-- contenu des quiz deviennent deux réglages indépendants, modifiables
-- séparément depuis le dashboard parental.
--
-- Additive et non destructive : colonne nullable, backfillée depuis `locale`
-- pour que les profils existants gardent leur comportement actuel sans rien
-- à faire côté client (le code lit déjà `quiz_language ?? locale` en repli).
--
-- Rédigée par l'agent, exécutée manuellement par Johan (aucune exécution
-- automatique — cf. context/ai-interaction.md, accord explicite requis
-- avant toute modification de schéma Supabase).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS quiz_language TEXT;

-- Backfill : les profils existants gardent leur langue actuelle comme
-- langue de quiz par défaut, jusqu'à ce qu'un parent la change explicitement.
UPDATE profiles
  SET quiz_language = locale
  WHERE quiz_language IS NULL;

-- Contrainte alignée sur les valeurs de `Locale` côté TypeScript ('fr' | 'en').
ALTER TABLE profiles
  ADD CONSTRAINT profiles_quiz_language_check
  CHECK (quiz_language IS NULL OR quiz_language IN ('fr', 'en'));

-- ─────────────────────────────────────────────────────────────────────────
-- Note d'intégration : src/lib/sync.ts n'a volontairement PAS encore été
-- modifié pour lire/écrire cette colonne (comme `theme`, qui reste lui
-- aussi un réglage local uniquement). Le champ `quiz_language` est
-- pleinement fonctionnel côté client (Zustand + localStorage) dès
-- maintenant, sans dépendre de cette migration. La synchronisation
-- multi-appareil viendra dans un lot séparé, une fois cette migration
-- appliquée en production — la référencer dans sync.ts avant qu'elle ne
-- soit exécutée casserait les appels Supabase existants (colonne absente).
