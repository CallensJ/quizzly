# Current Feature — Erudia (v1.4)

## Feature Name

Transition & Refonte Erudia v1.4 — Pivot "100% Plaisir" & Rationalisation Produit

## Status

In Progress

## Context & Objectives

Le produit initial v1.0 accumulait une dette de complexité (+21 000 questions, 21 catégories, alignement FLE/CECRL) non tenable pour un développeur solo et floue sur le plan marketing.  
La v1.4 réoriente complètement Erudia vers un quiz de culture générale amusant, fluide et autonome pour les 6–11 ans.

---

## Scope & Implementation Checklist

### 1. Landing Page Modale & Transition Marketing
- [ ] Créer la modale d'annonce v1.4 sur la landing page (`erudia.app`).
- [ ] Stocker l'affichage dans `localStorage` pour ne pas gêner la navigation répétée.
- [ ] Message clé : *"Erudia fait sa peau neuve ! 🦉 Version 1.4 plus simple, 100% plaisir, 7 jours d'essai gratuit"*.

### 2. Nettoyage & Data Restructuring (5 Catégories Phares)
- [x] Supprimer le catalogue v1.0 du dépôt (`src/data/questions/`, 42 fichiers, 22 689 questions)
      et rédiger la migration Supabase de purge (`supabase/migrations/20260813_v14_reset_catalogue.sql`,
      non exécutée — à la charge de Johan). **Écart assumé vis-à-vis de la ligne ci-dessous** :
      décision explicite de Johan de supprimer plutôt qu'archiver le catalogue v1.0, la maintenance
      de 21 catégories obsolètes n'ayant aucune valeur pour un dev solo.
- [x] Supprimer la mythologie (`MythSubcategory`, `lib/mythology.ts`, `MythologyPanel`) — catégorie
      parente à sous-catégories, absente des 5 catégories v1.4.
- [ ] Réduire le catalogue actif aux 5 catégories sélectionnées :
  - [ ] 📜 Histoire du Monde (200 FR / 200 EN)
  - [ ] 💡 Culture Générale (200 FR / 200 EN)
  - [ ] 🔬 Sciences & Nature (200 FR / 200 EN)
  - [ ] 🦖 Dinosaures & Préhistoire (200 FR / 200 EN)
  - [ ] 🚀 Espace & Astronomie (200 FR / 200 EN)
- [ ] Réduire le type `Category` (`src/types/index.ts`) aux 5 slugs v1.4 et réécrire le sélecteur de
      catégories de `HomeScreen` sans le split gratuit/premium par catégorie — reporté à ce chantier
      pour éviter de réécrire deux fois le même sélecteur (une fois maintenant, une fois avec le
      vrai modèle trial). Le type garde ses 20 valeurs v1.0 restantes dans l'intervalle.
- [x] ~~Mettre de côté / archiver les 16 autres catégories dans le dépôt sans altérer la BDD de prod.~~
      Remplacé par la suppression ci-dessus (décision explicite, cf. note).

### 3. Core Gameplay Updates
- [ ] Adapter `quizStore` pour charger des **sessions strictes de 10 questions** (au lieu de 20).
- [ ] Implémenter le composant **Timer Visuel** (barre de temps par question).
- [ ] Ajuster le système de progression de difficulté :
  - [ ] Promotion Facile $\rightarrow$ Moyen : Score $\ge 80\%$ sur 3 parties consécutives.
  - [ ] Promotion Moyen $\rightarrow$ Difficile : Score $\ge 90\%$ sur 3 parties consécutives.
  - [ ] Rétrogradation bienveillante si score $< 40\%$ sur 2 parties.

### 4. Gamification & Badges
- [ ] Configurer 5 badges débloquables par catégorie (25 badges v1.4 au total).
- [ ] Intégrer la mascotte Nova pour les célébrations et encouragements.

### 5. Nouveau Modèle Tarifaire (7-Day Trial)
- [ ] Mettre à jour la logique d'inscription : fixer `trial_ends_at = now() + 7 days` dans Supabase.
- [ ] Configurer le Paywall gracieux redirigeant vers Stripe Checkout à l'expiration du trial.
- [ ] Mettre à jour les grilles tarifaires et textes de la landing page.

### 6. Suppression des sous-systèmes v1.0 hors périmètre v1.4
Absents de toutes les specs v1.4 (`cahier-des-charges-claude-v1.4.md`, `strategie-de-marque.md`) ;
nettoyage maximal décidé avec Johan avant de commencer l'implémentation, pour ne pas construire les
features v1.4 par-dessus du code mort.
- [x] Multijoueur / duels asynchrones (`features/multiplayer/`, `lib/challenges.ts`, table
      Supabase `challenges`).
- [x] Défi quotidien (`features/daily/`, `lib/daily.ts`) — **le streak est conservé**, recâblé sur
      la fin de toute partie plutôt que sur le seul défi quotidien (sinon le badge « Persévérance
      5 jours » de la v1.4 devenait inatteignable). XP, boucliers et titres de joueur, absents des
      specs v1.4, ont été supprimés avec.
- [x] Objectifs, recommandations pédagogiques et rapports PDF (`lib/{goals,recommendations,report}.ts`,
      dépendance `@react-pdf/renderer`).
- [x] Statistiques détaillées (`features/stats/`, route `/stats`).

---

## Historique

**13 août 2026 — Sprint 1 (nettoyage)** : suppression du catalogue v1.0 (22 689 questions),
des sous-systèmes multijoueur/défi quotidien/objectifs-recos-PDF/stats, et de la mythologie.
Migration Supabase de purge rédigée pour relecture. `jest.config.ts` converti en `.js` (dépendance
`ts-node` absente). Réduction du type `Category` aux 5 slugs v1.4 explicitement reportée au
sprint suivant (voir section 2). Statut : chantiers 1, 3, 4, 5 encore à faire.

---

## Definition of Done (Acceptance Criteria)

1. Un utilisateur peut lancer un quiz de 10 questions sur l'une des 5 catégories en FR ou EN.
2. La langue de l'UI et la langue des questions s'inversent de manière indépendante depuis le Dashboard.
3. La barre de temps s'écoule correctement pour chaque question sans faire planter le state.
4. La règle d'essai de 7 jours verrouille l'accès aux profils dont le trial est expiré.
5. La suite de tests unitaires et E2E passe avec succès (`npm run test` & `npm run cypress:open`).
6. `npm run build` s'exécute sans aucune erreur TypeScript ou de rendu.