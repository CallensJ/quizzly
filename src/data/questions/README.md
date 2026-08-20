# src/data/questions/

Fallback JSON local pour le mode offline (voir `src/lib/questions.ts`).
Supabase reste la source primaire — ces fichiers ne sont utilisés que si
le cache IndexedDB est vide/expiré ET Supabase est injoignable.

## Convention

```
src/data/questions/{lang}/{category}.json
```

- `{lang}` : `fr` ou `en`
- `{category}` : un des 5 slugs v1.4 — `histoire-du-monde`, `culture-generale`,
  `sciences-nature`, `dinosaures`, `espace`

## Format attendu

Voir `scripts/questions/prompt_generation.md` pour le prompt de génération
et le schéma JSON exact (`{ category, lang, questions: [...] }`).

## Après avoir ajouté un fichier

1. Contrôle qualité :
   ```bash
   python3 scripts/questions/globaux/filter_structure.py src/data/questions/{lang}/{category}.json
   python3 scripts/questions/globaux/filter_duplicate.py src/data/questions/{lang}/{category}.json
   python3 scripts/questions/globaux/filter_answer_distribution.py src/data/questions/{lang}/{category}.json
   python3 scripts/questions/globaux/filter_difficulty_distribution.py src/data/questions/{lang}/{category}.json
   python3 scripts/questions/fr/filter_fr_language.py src/data/questions/{lang}/{category}.json   # fichiers fr uniquement
   ```
2. Import en base via `scripts/migrate-questions.ts` (`npx tsx scripts/migrate-questions.ts`)
   — la liste `FILES` du script doit rester à jour avec les fichiers présents ici.
3. Optionnel — réactiver le fallback offline en réalimentant `LOCAL_JSON_MAP`
   dans `src/lib/questions.ts` (laissé vide tant qu'aucun fichier n'existe,
   pour ne pas casser `npm run build` avec un import statique manquant).
