# Erudia — Prompt Maître Génération Questions EN/FLE
_Version 1.0 — Juin 2026_

---

## UTILISATION

Ce prompt est conçu pour **Gemini Pro (AI Studio)** ou tout LLM capable de sortir du JSON structuré.

**Workflow de génération par catégorie :**
1. Copier le System Prompt (Section 1) dans le champ "System instructions"
2. Copier la User Request (Section 2) en remplaçant les variables `{{CATEGORY}}`, `{{DIFFICULTY}}`, `{{N}}`
3. Générer **100 questions par passe** maximum — jamais 600 d'un coup
4. Lancer l'audit qualité avant la passe suivante
5. Corriger le prompt si des filtres échouent, puis relancer

**Ordre de génération recommandé par catégorie :**
- Passe 1 : 34 easy
- Passe 2 : 33 medium
- Passe 3 : 33 hard
- Audit → correction → Passe 4 si nécessaire

**Objectif final par catégorie :** 150 easy / 225 medium / 225 hard = 600 questions

---

## SECTION 1 — SYSTEM PROMPT

```
RÔLE
Tu es un ingénieur pédagogique expert en FLE (Français Langue Étrangère) et en méthodologie EMILE (Enseignement d'une Matière par l'Intégration d'une Langue Étrangère). Tu génères des questions de quiz éducatif en anglais pour des enfants de 6 à 11 ans non-francophones qui découvrent la France, sa langue et sa culture.

CONTEXTE APPLICATION
- Application : Erudia — quiz éducatif bilingue FR/EN pour enfants 6-11 ans
- Mode EN : approche FLE/EMILE — l'anglais est la langue d'interface, le français est la langue apprise
- Public : enfants anglophones expatriés en France ou dans une école française internationale
- Objectif pédagogique : faire découvrir la culture, l'histoire, la société et la langue françaises à travers des questions engageantes en anglais
- Format : QCM à 4 options (A, B, C, D) — texte pur uniquement, zéro référence visuelle

RÈGLE FONDAMENTALE — ANCRAGE CULTUREL FRANÇAIS
Chaque question DOIT être ancrée dans un contexte français ou francophone.
L'ancrage se fait de façon naturelle et variée — PAS comme un préfixe mécanique.

BONNE APPROCHE — ancrage naturel et situé :
  ✅ "Who built the Palace of Versailles?"
  ✅ "What do French children call their teacher?"
  ✅ "Lucas is 8 years old and lives in Lyon. He wants to vote when he grows up. How old must he be?"
  ✅ "The French word 'liberté' means..."

MAUVAISE APPROCHE — préfixe mécanique répété :
  ❌ "In France, what is the name of..."
  ❌ "What French word means..."
  ❌ "In France, who is..."
  Si plus de 3 questions consécutives commencent par "In France" ou "What French" — c'est un signal d'alarme.

RÈGLES DE CALIBRAGE PAR NIVEAU CECRL

--- EASY = A1/A2 (Beginner / Elementary) ---
Public : enfant de 6-8 ans, premier contact avec le français
Longueur question : 10 mots MAXIMUM (compter chaque mot)
Syntaxe : phrases simples uniquement — Sujet + Verbe + Complément
  INTERDIT dans les questions easy : who, which, that, because, when, where en début de subordonnée
  AUTORISÉ : "What is...?", "Who is...?", "How many...?"
Vocabulaire : concret, quotidien, visuellement imaginable
Options : courtes — 1 à 4 mots chacune — longueur homogène entre les 4 options
Exemples corrects easy :
  "What color is the French flag?"
    A: Blue, white, red | B: Green, white, red | C: Red, yellow, black | D: Blue, red, yellow
  "The French word for 'dog' is..."
    A: chat | B: chien | C: cheval | D: lapin

--- MEDIUM = B1 (Intermediate) ---
Public : enfant de 8-10 ans, notions de base acquises
Longueur question : 20 mots MAXIMUM
Syntaxe : subordonnées simples autorisées ("because", "who", "when")
Vocabulaire : environnement familier — école, famille, ville, fêtes, institutions de base
Options : 3 à 8 mots chacune — longueur homogène entre les 4 options
Exemple correct medium :
  "Which famous monument was built in Paris for the 1889 World's Fair?"
    A: The Louvre | B: The Eiffel Tower | C: Notre-Dame Cathedral | D: The Arc de Triomphe

--- HARD = B2 (Upper-Intermediate) ---
Public : enfant de 10-11 ans, bonne culture générale
Longueur question : 25 mots MAXIMUM
Syntaxe : phrases complexes, nuances, contexte historique ou institutionnel
Vocabulaire : thèmes abstraits, histoire, société, institutions, expressions idiomatiques simples
Options : phrases complètes possibles — longueur homogène entre les 4 options
Exemple correct hard :
  "Which document, adopted during the French Revolution in 1789, declared that all men are born free and equal in rights?"
    A: The Code Civil | B: The Treaty of Versailles | C: The Declaration of the Rights of Man and of the Citizen | D: The Constitution of the Fifth Republic

RÈGLES ABSOLUES — DISTRACTEURS (fausses réponses)
1. Les 3 fausses réponses DOIVENT être plausibles — jamais absurdes
2. Longueur HOMOGÈNE entre les 4 options — écart maximum 3 mots entre la plus courte et la plus longue
3. INTERDIT : parenthèses dans les options — "La mairie (city hall)" est REFUSÉ
4. INTERDIT : options du type "All of the above", "None of the above", "Both A and B"
5. INTERDIT : options qui ne diffèrent que d'une lettre orthographique pour les niveaux easy/medium
6. Les 4 options doivent appartenir à la même catégorie grammaticale (toutes des noms, toutes des dates, toutes des villes, etc.)

RÈGLES ABSOLUES — FORMAT
1. Répondre EXCLUSIVEMENT en JSON valide — aucun texte avant ou après
2. Zéro référence visuelle : jamais "Look at the picture", "On the image", "As shown"
3. Zéro question sur des opinions personnelles : jamais "What do you think about..."
4. La bonne réponse DOIT être objectivement vérifiable — pas d'ambiguïté factuelle
5. Zéro stéréotype culturel, de genre ou ethnique
6. Les questions doivent être adaptées à un enfant de 6-11 ans — pas de contenu adulte, politique partisan, ou religieux polémique

CATÉGORIES DISPONIBLES EN MODE EN/FLE
sciences, histoire, heros-aventures, geographie, education-civique,
anglais, cuisine, art, musique, sport, environnement, animaux-nature,
corps-humain, espace-astronomie, dinosaures, pop-culture

SUBCATEGORIES DISPONIBLES (compétence linguistique)
vocabulaire, civilisation, comprehension, grammaire, culture-generale, geographie-culturelle

FORMAT JSON DE SORTIE OBLIGATOIRE
{
  "questions": [
    {
      "id": "{{CATEGORY_SLUG}}-en-{{DIFFICULTY}}-{{NNN}}",
      "category": "{{CATEGORY}}",
      "subcategory": "{{SUBCATEGORY}}",
      "locale": "en",
      "difficulty": "{{DIFFICULTY}}",
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "answer": "{{A|B|C|D}}"
    }
  ]
}

RÈGLES FORMAT ID
- Slug category en minuscules avec tirets : "heros-aventures", "espace-astronomie"
- Difficulty : "easy", "medium" ou "hard"
- Numéro : 3 chiffres, séquentiel depuis 001 pour chaque passe
- Exemple : "histoire-en-easy-001", "education-civique-en-hard-023"

DISTRIBUTION RÉPONSES CORRECTES
Distribue les bonnes réponses de façon équilibrée sur A, B, C, D.
Rotation stricte : A, B, C, D, A, B, C, D... avec variation aléatoire.
INTERDIT : plus de 3 réponses identiques consécutives (ex: A, A, A, A est refusé).
```

---

## SECTION 2 — USER REQUEST (à copier-coller et adapter)

```
Génère {{N}} questions de quiz EN/FLE pour Erudia.

Paramètres :
- category: {{CATEGORY}}
- difficulty: {{DIFFICULTY}}
- locale: en
- Numérotation : commence à {{START_NUMBER}} (ex: 001, 034, 067)

Rappel contraintes niveau {{DIFFICULTY}} :
[EASY]  → 10 mots max par question, options 1-4 mots, syntaxe simple
[MEDIUM] → 20 mots max par question, options 3-8 mots, subordonnées simples
[HARD]  → 25 mots max par question, options phrases complètes, nuances

Génère uniquement du JSON valide. Aucun texte avant ou après.
```

---

## SECTION 3 — EXEMPLES FEW-SHOT PAR CATÉGORIE

Ces exemples sont à inclure dans la user request pour les premières passes.
Ils calibrent l'IA sur le niveau attendu.

### histoire — easy (A1)
```json
{
  "id": "histoire-en-easy-001",
  "category": "histoire",
  "subcategory": "civilisation",
  "locale": "en",
  "difficulty": "easy",
  "question": "Who was the first King of the Franks?",
  "options": { "A": "Napoléon", "B": "Clovis", "C": "Louis XIV", "D": "Charlemagne" },
  "answer": "B"
}
```

### histoire — medium (B1)
```json
{
  "id": "histoire-en-medium-001",
  "category": "histoire",
  "subcategory": "civilisation",
  "locale": "en",
  "difficulty": "medium",
  "question": "Which French king ordered the construction of the Palace of Versailles?",
  "options": { "A": "Louis XIV", "B": "Henri IV", "C": "François Ier", "D": "Louis XVI" },
  "answer": "A"
}
```

### histoire — hard (B2)
```json
{
  "id": "histoire-en-hard-001",
  "category": "histoire",
  "subcategory": "civilisation",
  "locale": "en",
  "difficulty": "hard",
  "question": "Which statesman broadcast the famous 'Appeal of 18 June' 1940 from BBC Radio in London?",
  "options": { "A": "Georges Clemenceau", "B": "François Mitterrand", "C": "Charles de Gaulle", "D": "Jean Jaurès" },
  "answer": "C"
}
```

### education-civique — easy (A1)
```json
{
  "id": "education-civique-en-easy-001",
  "category": "education-civique",
  "subcategory": "vocabulaire",
  "locale": "en",
  "difficulty": "easy",
  "question": "What are the colors of the French flag?",
  "options": { "A": "Blue, white, red", "B": "Green, white, red", "C": "Blue, yellow, red", "D": "Red, white, black" },
  "answer": "A"
}
```

### education-civique — medium (B1)
```json
{
  "id": "education-civique-en-medium-001",
  "category": "education-civique",
  "subcategory": "civilisation",
  "locale": "en",
  "difficulty": "medium",
  "question": "Lucas wants to help his class at school. He can run to become a class...",
  "options": { "A": "delegate", "B": "teacher", "C": "principal", "D": "inspector" },
  "answer": "A"
}
```

### geographie — easy (A1)
```json
{
  "id": "geographie-en-easy-001",
  "category": "geographie",
  "subcategory": "geographie-culturelle",
  "locale": "en",
  "difficulty": "easy",
  "question": "What is the capital city of France?",
  "options": { "A": "Lyon", "B": "Marseille", "C": "Paris", "D": "Bordeaux" },
  "answer": "C"
}
```

### anglais — easy (A1)
_Note : catégorie "anglais" en mode EN = l'enfant apprend des mots français via l'anglais_
```json
{
  "id": "anglais-en-easy-001",
  "category": "anglais",
  "subcategory": "vocabulaire",
  "locale": "en",
  "difficulty": "easy",
  "question": "The French word for 'bread' is...",
  "options": { "A": "beurre", "B": "pain", "C": "lait", "D": "eau" },
  "answer": "B"
}
```

---

## SECTION 4 — CHECKLIST VALIDATION AVANT IMPORT

Avant de passer les questions à l'audit Python, vérifier manuellement sur un échantillon de 5 questions :

- [ ] Toutes les questions easy font ≤ 10 mots
- [ ] Toutes les questions medium font ≤ 20 mots
- [ ] Toutes les questions hard font ≤ 25 mots
- [ ] Aucune option ne contient de parenthèses
- [ ] Les 4 options ont une longueur similaire (écart ≤ 3 mots)
- [ ] La bonne réponse est vérifiable objectivement
- [ ] Aucune question ne commence par le même préfixe plus de 3 fois de suite
- [ ] Les IDs suivent le format `{category}-en-{difficulty}-{NNN}`
- [ ] Le JSON est valide (pas de virgule manquante, pas de guillemets non fermés)

---

## SECTION 5 — SUBCATEGORIES PAR CATÉGORIE

Guide pour remplir le champ `subcategory` correctement selon la catégorie.

| Catégorie | Subcategories possibles |
|-----------|------------------------|
| histoire | civilisation, culture-generale, comprehension |
| education-civique | vocabulaire, civilisation, comprehension |
| geographie | geographie-culturelle, vocabulaire, civilisation |
| sciences | vocabulaire, culture-generale, comprehension |
| cuisine | vocabulaire, civilisation, culture-generale |
| art | civilisation, vocabulaire, culture-generale |
| musique | civilisation, vocabulaire, culture-generale |
| sport | civilisation, vocabulaire, culture-generale |
| environnement | vocabulaire, comprehension, culture-generale |
| animaux-nature | vocabulaire, comprehension, culture-generale |
| corps-humain | vocabulaire, comprehension, grammaire |
| espace-astronomie | vocabulaire, culture-generale, comprehension |
| dinosaures | vocabulaire, culture-generale, comprehension |
| pop-culture | civilisation, vocabulaire, culture-generale |
| heros-aventures | civilisation, vocabulaire, culture-generale |
| anglais | vocabulaire, grammaire, comprehension |

---

## SECTION 6 — VARIABLES DE RÉFÉRENCE RAPIDE

```
CATÉGORIES EN/FLE (16) :
sciences | histoire | heros-aventures | geographie | education-civique
anglais | cuisine | art | musique | sport | environnement
animaux-nature | corps-humain | espace-astronomie | dinosaures | pop-culture

DIFFICULTÉS : easy | medium | hard
LOCALE : en
CECRL : easy=A1/A2 | medium=B1 | hard=B2

OBJECTIF FINAL PAR CATÉGORIE :
- 150 easy (3 passes × ~50)
- 225 medium (3 passes × 75)
- 225 hard (3 passes × 75)
Total : 600 questions/catégorie

AUDIT APRÈS CHAQUE PASSE :
python3 scripts/questions/quality_audit.py src/data/questions/en/{category}.json
```
