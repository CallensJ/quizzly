# Prompt de génération — questions Erudia v1.4

Prompt calibré sur les règles exactes des scripts de contrôle qualité déjà en
place (`scripts/questions/globaux/filter_*.py`, `scripts/questions/fr/filter_fr_language.py`)
pour qu'un lot généré les passe du premier coup. Un seul appel à Gemini = un
fichier complet de 200 questions (une catégorie, une langue).

## Comment s'en servir

1. Remplacer les 4 variables entre `[[ ]]` en bas de ce document par les valeurs
   de la catégorie/langue à générer (une combinaison à la fois — 10 lots au
   total : 5 catégories × 2 langues).
2. Coller le prompt complet dans Gemini.
3. Sauvegarder la réponse telle quelle dans
   `src/data/questions/[[LANG]]/[[CATEGORY_SLUG]].json`.
4. Faire passer les scripts de contrôle :
   ```bash
   python3 scripts/questions/globaux/filter_structure.py src/data/questions/[[LANG]]/[[CATEGORY_SLUG]].json
   python3 scripts/questions/globaux/filter_duplicate.py src/data/questions/[[LANG]]/[[CATEGORY_SLUG]].json
   python3 scripts/questions/globaux/filter_answer_distribution.py src/data/questions/[[LANG]]/[[CATEGORY_SLUG]].json
   python3 scripts/questions/globaux/filter_difficulty_distribution.py src/data/questions/[[LANG]]/[[CATEGORY_SLUG]].json
   python3 scripts/questions/fr/filter_fr_language.py src/data/questions/[[LANG]]/[[CATEGORY_SLUG]].json   # fichiers fr uniquement
   ```
5. Si un filtre échoue (doublon, distribution hors tolérance…), redemander à
   Gemini de corriger précisément les IDs signalés plutôt que de tout
   régénérer — le prompt ci-dessous accepte des demandes de correction
   ciblées en suivi de conversation.

---

## Prompt à copier

```
Tu génères des questions de quiz pour Erudia, une application de quiz de
culture générale 100% ludique pour des enfants de 6 à 11 ans. Aucun objectif
pédagogique caché, aucune progression scolaire : le seul but est que l'enfant
s'amuse et apprenne des choses intéressantes en jouant.

## Tâche

Génère exactement 200 questions à choix multiples pour :
- Catégorie : [[CATEGORY_LABEL]]
- Langue de rédaction : [[LANG_LABEL]]
- Portée thématique : [[CATEGORY_SCOPE]]

## Format de sortie — STRICT

Réponds UNIQUEMENT avec un objet JSON valide, sans balise markdown ```,
sans texte avant ou après. Structure exacte :

{
  "category": "[[CATEGORY_SLUG]]",
  "lang": "[[LANG]]",
  "questions": [
    {
      "id": "[[ID_PREFIX]]-[[LANG]]-0001",
      "difficulty": "easy",
      "question": "Texte de la question ?",
      "options": {
        "A": "Première option",
        "B": "Deuxième option",
        "C": "Troisième option",
        "D": "Quatrième option"
      },
      "answer": "A"
    }
  ]
}

Règles de format, vérifiées automatiquement après génération — à respecter
strictement :
- `id` : exactement `[[ID_PREFIX]]-[[LANG]]-NNNN`, NNNN sur 4 chiffres avec
  zéros de tête, de 0001 à 0200, sans trou ni doublon.
- `difficulty` : uniquement "easy", "medium" ou "hard".
- `answer` : uniquement "A", "B", "C" ou "D" — doit correspondre à une clé
  réellement présente dans `options`.
- `question` : 300 caractères maximum, jamais vide.
- Les 4 options sont non vides et strictement différentes les unes des
  autres (aucune reformulation quasi-identique entre deux options d'une
  même question).

## Exactitude et exigence factuelle

- Chaque question et chaque réponse doivent être factuellement exactes et
  vérifiables. En cas de doute sur un fait précis (date, chiffre, nom),
  choisis un fait plus largement établi plutôt que d'inventer ou d'arrondir
  au hasard.
- N'invente jamais un fait, un chiffre ou un record pour combler une
  catégorie de difficulté.
- Une seule bonne réponse doit être défendable par question — élimine toute
  question où deux options pourraient raisonnablement être correctes.
- Aucun contenu effrayant, violent, anxiogène ou inapproprié pour un enfant
  de 6 à 11 ans.

## Qualité des distracteurs (mauvaises réponses)

- Chaque mauvaise réponse doit être plausible dans son domaine (pas absurde,
  pas une blague, pas une évidence à écarter au premier regard) mais
  clairement incorrecte pour qui connaît la bonne réponse.
- Les 4 options d'une même question ont une longueur et un niveau de
  précision comparables — la bonne réponse ne doit jamais être identifiable
  simplement parce qu'elle est plus longue, plus précise ou mieux formulée
  que les distracteurs.
- Aucun distracteur ne doit reposer sur une connaissance jamais enseignée
  ni sur un piège purement grammatical.

## Calibrage des 3 niveaux de difficulté

- **easy** : fait très connu, qu'un enfant de 6-8 ans croise déjà
  spontanément (école, dessins animés, livres illustrés). Question courte et
  directe, une seule idée.
- **medium** : demande une connaissance un peu plus précise, plausible pour
  un enfant de 9-10 ans curieux ; peut comparer ou situer deux éléments.
- **hard** : fait plus pointu mais toujours du niveau d'une encyclopédie
  jeunesse — pas de trivia d'expert adulte, pas de raisonnement à plusieurs
  étapes. Un enfant de 11 ans passionné par le sujet doit pouvoir la
  connaître ou la déduire.

## Répartition obligatoire sur les 200 questions

- Difficulté : 50 easy (25%) / 75 medium (37,5%) / 75 hard (37,5%) —
  tolérance ±8% par niveau.
- Bonne réponse : répartis les lettres A/B/C/D à peu près également sur les
  200 questions (tolérance ±10% entre la lettre la plus et la moins
  représentée — vise environ 50 de chaque). Varie l'ordre : n'enchaîne
  jamais 4 questions consécutives ou plus avec la même lettre correcte.
  Change aussi la position de la bonne réponse d'une question à l'autre —
  ne mets pas systématiquement la bonne réponse en A.

## Anti-doublons

- Aucune question ne doit être reformulée deux fois (même sens, formulation
  différente) : un ensemble de 200 questions sur ce thème doit couvrir 200
  faits ou angles réellement distincts.
- Deux questions différentes ne doivent jamais partager exactement les 4
  mêmes options (même dans un ordre différent).
- Si le sujet est trop étroit pour tenir 200 questions sans répétition,
  élargis légèrement la portée thématique plutôt que de reformuler des
  questions déjà posées.

Génère maintenant les 200 questions.
```

---

## Variables à remplacer

| Variable | Valeurs possibles |
|---|---|
| `[[CATEGORY_LABEL]]` | Histoire du Monde · Culture Générale · Sciences & Nature · Dinosaures & Préhistoire · Espace & Astronomie |
| `[[CATEGORY_SLUG]]` | `histoire-du-monde` · `culture-generale` · `sciences-nature` · `dinosaures` · `espace` |
| `[[ID_PREFIX]]` | `hist` · `cult` · `sci` · `dino` · `space` (mêmes préfixes que `src/lib/badges.ts`) |
| `[[CATEGORY_SCOPE]]` | voir tableau ci-dessous |
| `[[LANG]]` | `fr` · `en` |
| `[[LANG_LABEL]]` | Français · Anglais |

### Portée thématique par catégorie (`[[CATEGORY_SCOPE]]`)

- **Histoire du Monde** : grandes civilisations, inventions marquantes,
  événements mondiaux — vision globale, pas de centrage exclusif sur la
  France.
- **Culture Générale** : anecdotes amusantes, curiosités variées, faits
  surprenants tous domaines confondus.
- **Sciences & Nature** : corps humain, phénomènes naturels amusants,
  physique accessible, plantes et écosystèmes.
- **Dinosaures & Préhistoire** : périodes géologiques, fossiles, espèces
  célèbres, mode de vie.
- **Espace & Astronomie** : système solaire, planètes, étoiles, conquête
  spatiale.

## Les 10 lots à générer

`histoire-du-monde` (fr, en) · `culture-generale` (fr, en) ·
`sciences-nature` (fr, en) · `dinosaures` (fr, en) · `espace` (fr, en)
