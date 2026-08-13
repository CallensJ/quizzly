# Coding Standards — Erudia (v1.4)

## Core Principles

- Conserver la structure et les patterns du projet `quizzly` (`src/app/[locale]`, `src/components`, `src/stores`)
- Favoriser un code lisible, modulaire et typé. 
- Éviter d'ajouter de nouvelles dépendances npm si la stack actuelle (Next.js, Zustand, Framer Motion, Howler.js) couvre le besoin 
- Prioriser l'accessibilité, les performances de rendu et le support offline-first.

## TypeScript & Types


- Mode strict activé en permanence (`tsconfig.json`).
- `any` est strictement interdit. Utiliser des types précis ou des unions.
- Centraliser les interfaces métier dans `src/types/index.ts` (point d'entrée unique) :
  - Models : `Question`, `QuestionFile`, `Category`, `Profile`, `QuizSession`, `Challenge`.
- Utiliser les unions littérales pour les ensembles fermés :
  - `Difficulty = 'easy' | 'medium' | 'hard'`
  - `Locale = 'en' | 'fr'`
  - `AnswerKey = 'A' | 'B' | 'C' | 'D'`

### Catégories : état actuel vs cible v1.4

- **Cible v1.4** — les 5 catégories officielles :
  `CategorySlug = 'histoire-du-monde' | 'culture-generale' | 'sciences-nature' | 'dinosaures' | 'espace'`
- **État actuel** — le type `Category` (`src/types/index.ts`) liste encore les **20 catégories
  jouables de la v1.0** (`sciences`, `histoire`, `espace-astronomie`, etc.). `mythology` a été
  retiré (Sprint 1, nettoyage) avec sa hiérarchie de sous-catégories. Ces slugs ne correspondent
  pas à ceux de la cible, et `culture-generale` n'existe pas encore.
- La réduction à 5 catégories fait partie du **chantier 2 de `current-feature.md`**, reportée
  volontairement au Sprint 2 : elle implique de réécrire le sélecteur de catégories de
  `HomeScreen` (actuellement organisé en `CATEGORIES`/`PREMIUM_CATEGORIES`, modèle gratuit/premium
  par catégorie) sans ce split, remplacé par le trial 7 jours. Tant que ce n'est pas fait, écrire
  du code contre le type `Category` réel, pas contre `CategorySlug`.

### Bilinguisme découplé (à implémenter)

Le cahier des charges §5 prévoit deux réglages indépendants, `interface_language` et
`quiz_language`. **Aucun des deux n'existe dans le code** : `Profile` ne porte qu'un seul champ
`locale`. Le découplage touche le schéma Supabase et requiert l'accord explicite de Johan.


## React & Next.js (App Router)


- Préférer les Server Components par défaut. 
- Déclarer `"use client"` uniquement pour les composants interactifs, les écrans de jeu utilisant Zustand, les animations Framer Motion ou l'audio Howler.js. 
- Respecter le routage internationalisé de `next-intl` sous `src/app/[locale]/`.
- Garder les stores Zustand (`src/stores/`) atomiques :
  - `quizStore` : État de la partie en cours (questions, timer, score) — non persisté.
  - `profileStore` : Profil enfant, avatars DiceBear, badges débloqués, historique des sessions.
  - `authStore` : Session Supabase, statut de l'essai 7 jours / Premium.
  - `novaStore` : État de la mascotte Nova (messages, encouragements, célébrations).

## Data & Questions Format


- Le catalogue de questions respecte une séparation stricte par langue.
- Chemin : **`src/data/questions/[lang]/[category].json`** — la langue d'abord, puis la catégorie.
- Cible v1.4 : exactement 200 questions par langue et par catégorie (soit 400 par catégorie).
- Chaque fichier est un objet `QuestionFile` : un en-tête `category` + `lang`, puis le tableau
  `questions`. Les champs correspondent au type `Question` de `src/types/index.ts` : les réponses
  sont un **objet `{A,B,C,D}`** et la bonne réponse est une **lettre** (`answer`), pas un index.

```json
{
  "category": "dinosaures",
  "lang": "fr",
  "questions": [
    {
      "id": "dino-fr-0001",
      "category": "dinosaures",
      "subcategory": null,
      "locale": "fr",
      "difficulty": "easy",
      "question": "Quel célèbre dinosaure possédait trois cornes sur le devant de sa tête ?",
      "options": {
        "A": "Le Triceratops",
        "B": "Le Stégosaure",
        "C": "Le Diplodocus",
        "D": "Le Vélociraptor"
      },
      "answer": "A"
    }
  ]
}
```

- Convention d'`id` : `[prefixe]-[lang]-[difficulte]-[numero]` (ex. `sci-fr-easy-001`). Certains
  jeux de données plus récents utilisent `[prefixe]-[lang]-[numero]` (ex. `dino-fr-0001`).
- `subcategory` n'est utilisé que par la catégorie `mythology` (héritage v1.0) ; `null` ailleurs.
- Il n'y a **pas** de champ `explanation` dans le type `Question`. En ajouter un serait une
  évolution du modèle de données, à valider avant implémentation.


## UI / UX Guidelines pour Enfants (6–11 ans)


- **Composants visuels** : Boutons larges, retours visuels immédiats (vert/rouge) et animations gratifiantes.
    
- **Audio** : Effets sonores subtils via Howler.js (bonne réponse, décompte du timer, déblocage de badge).
    
- **Timer** : Composant de barre de progression fluide (15 à 20s par question), animé en SCSS. Ne pas générer de stress punitif. À l'expiration, la question est comptée fausse et l'app passe à la suivante.

## Security & Monetization Checks

- **Validation des accès** : Vérifier la date d'expiration de l'essai gratuit (`trial_ends_at`) sur la session.
    
- **Stripe** : Gérer les webhooks de manière sécurisée côté Edge Functions / API routes.
    
- **Sérénité** : Zéro collecte de données nominatives d'enfants (COPPA/RGPD).

