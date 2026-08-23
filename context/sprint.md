# 🏃 Sprint Roadmap — Erudia v1.4

> Découpage des features restantes en 3 sprints logiques — Focus sur dépendances et ordre d'implémentation.

---

## 📋 Sprint 1 : Foundation Data & Structure (Baseline)

**Objectif** : Préparer la foundation technique et les données pour les sprints suivants.

### Features

#### 1.1 Générer/Importer les 5 Catégories JSON
- [x] **Histoire du Monde** (200 FR / 200 EN) — JSON corrigé ✓
- [x] **Culture Générale** (200 FR / 200 EN)
- [x] **Sciences & Nature** (200 FR / 200 EN)
- [x] **Dinosaures & Préhistoire** (200 FR / 200 EN)
- [x] **Espace & Astronomie** (200 FR / 200 EN)

**Sous-tâches** :
- [x] Générer questions via Gemini prompt (`scripts/questions/prompt_generation.md`)
- [x] Valider QA via scripts existants
- [x] Placer fichiers JSON en `src/data/questions/{locale}/{category}.json`
- [x] Exécuter `npx tsx scripts/migrate-questions.ts` → Supabase

**Critères d'acceptation** :
- [x] Les 5 catégories (2000 questions au total, 1000 FR + 1000 EN) sont présentes en Supabase — vérifié le 2026-08-22
- [x] `npx tsx scripts/migrate-questions.ts` s'exécute sans erreurs
- [x] Vérification : chaque catégorie/langue = 200 questions en DB

---

#### 1.2 Exécuter Migration Supabase de Purge
- [x] Valider script `supabase/migrations/20260813_v14_reset_catalogue.sql` — **révisé le 2026-08-22** :
      le `TRUNCATE TABLE questions` a été retiré (aurait détruit les 2000 questions v1.4 déjà
      migrées) ; la section RLS freemium a été reportée à Sprint 3 (dépend du trial 7 jours).
      Le script ne contient plus que du nettoyage sûr (colonne `subcategory`, table `challenges`,
      colonnes `admin_settings`).
- [x] Vérifier si l'ancien catalogue v1.0 traîne encore en DB à côté des 2000 questions v1.4 —
      **vérifié le 2026-08-22** : la table `questions` ne contient que les 5 catégories v1.4
      (400 par catégorie = 200 FR + 200 EN, total 2000). Aucun résidu v1.0. Pas de `DELETE`
      ciblé nécessaire.
- [x] Exécuter le script révisé (manuellement, par Johan) — **fait le 2026-08-22**

**Critères d'acceptation** :
- [x] Migration exécutée sans erreurs
- [x] Table `questions` ne contient que catégories : `histoire-du-monde`, `culture-generale`, `sciences-nature`, `dinosaures`, `espace`

---

#### 1.3 Réduire Type `Category` aux 5 Slugs v1.4
- [ ] Éditer `src/types/index.ts` → remplacer 21 slugs par 5 seulement
- [ ] Mettre à jour tous les imports/usages de `Category` dans la codebase
- [ ] Valider TypeScript : `npm run type-check` sans erreurs

**Fichiers affectés** :
- `src/types/index.ts`
- Tous les composants utilisant `Category` (rechercher `type Category`)

**Critères d'acceptation** :
- TypeScript compile sans erreurs
- Aucune référence à catégories obsolètes (v1.0)

---

#### 1.4 Réécrire Sélecteur de Catégories (`HomeScreen`)
- [ ] Simplifier `HomeScreen` pour afficher uniquement 5 catégories
- [ ] Retirer split gratuit/premium par catégorie (sera géré par trial global)
- [ ] Design : grille 5 cartes (ou 2x3 avec padding)

**Critères d'acceptation** :
- `HomeScreen` affiche les 5 catégories seulement
- Sélectionner une catégorie → lancements quiz fonctionnel
- Visuels couvrent les 5 catégories (emoji/icônes)

---

### Definition of Done (Sprint 1)
- [x] Les 5 catégories JSON sont correctes et importées en Supabase
- [ ] Type `Category` réduit à 5 slugs, TypeScript passe
- [ ] `HomeScreen` affiche les 5 catégories
- [x] Migration v1.0 purge exécutée

---

---

## 🎮 Sprint 2 : Core Gameplay & Gamification

**Objectif** : Implémenter le cœur du gameplay v1.4 (sessions 10q, timer, progression, badges, bilinguisme découplé).

**⚠️ Révision 2026-08-22** : ce document a été rédigé sur la base de `current-feature.md`, resté
périmé. En réalité `develop` contenait déjà la quasi-totalité de ce sprint au moment de la
rédaction (commits S2-4, S2-5, S2-6 + sessions 10q + timer). Statuts ci-dessous corrigés après
vérification directe du code sur `develop`.

### Features

#### 2.1 Sessions Strictes de 10 Questions
- [x] Adapté (`24f4bda feat: passer les sessions de quiz à 10 questions`) — déjà sur `develop`

---

#### 2.2 Timer Visuel (Barre de Temps)
- [x] Implémenté (`9ed5002 fix: respecter prefers-reduced-motion sur le timer visuel du quiz` —
      le fix confirme l'existence du composant timer, déjà sur `develop`)

---

#### 2.3 Progression de Difficulté (Règles Auto)
- [x] Implémenté (`1f5bee0 feat: progression de difficulté par catégorie (S2-4)`) — déjà sur `develop`
- [ ] Non revérifié en détail : les seuils exacts (80%/3 parties, 90%/3 parties, <40%/2 parties)
      et la modale Nova méritent un test manuel avant de clore ce point définitivement.

---

#### 2.4 Gamification & Badges
- [x] Système de badges déjà présent (`src/lib/badges.ts`, `BadgeGroups` par catégorie +
      transversaux/méta) — **plus riche que les "5 badges/catégorie" du cahier des charges**
      (paliers curious/passionate/expert/master/legend par catégorie, + badges streak/volume/
      difficulté/transversaux). Écart positif vis-à-vis de la spec littérale — à valider avec
      Johan si on aligne strictement sur les 5 badges v1.4 ou si on garde ce système plus riche.
- [ ] Mascotte Nova : présence à confirmer (commit historique `added integration premium nova`
      existe mais antérieur au pivot v1.4, à revérifier dans l'UI actuelle).

---

#### 2.5 Bilinguisme Découplé (Language Independence)
- [x] Backend/store implémenté (`256f2d9 feat: bilinguisme découplé — quiz_language indépendant
      de l'interface (S2-5)`) — déjà sur `develop`.
- [x] **Cause du couplage apparent identifiée le 2026-08-22** (signalé par Johan) : ce n'est pas
      un bug de code. `HomeScreen.tsx`/`ProfileScreen.tsx` ne changent bien QUE `locale`
      (interface) — conforme au découplage. Mais `quizLanguage` est optionnel et n'a qu'un seul
      point de réglage : `QuizLanguageSection` dans `AdminScreen` (dashboard parental protégé
      PIN), jamais visité en usage courant. Tant que `quizLanguage` n'est jamais réglé
      explicitement, `HomeScreen`/`ResultsScreen` retombent sur
      `profile?.quizLanguage ?? locale` → `quizLanguage` suit `locale` par défaut, d'où
      l'impression de couplage.
- [ ] **Décision produit à prendre** : soit exposer un sélecteur `quizLanguage` accessible
      hors dashboard parental (navbar/profil), soit documenter/assumer que le découplage n'est
      accessible que via l'espace parent. Actuellement aucun grand public ne peut dissocier les
      deux sans PIN admin.
- [ ] Point secondaire : `quizLanguage` réglé via `AdminScreen` reste en `localStorage` seul
      (pas de persistance Supabase cross-device — migration écrite mais non appliquée,
      volontairement, cf. message du commit S2-5). À planifier si l'usage multi-appareils
      compte (ex. tablette + PC).

---

### Definition of Done (Sprint 2)
- [ ] Quiz lancés = 10 questions exactement
- [ ] Timer visuel fonctionne sans crash
- [ ] Progression (easy → moyen → difficile) respecte règles
- [ ] 25 badges débloquables + Nova mascotte intégrée
- [ ] `interface_language` ≠ `quiz_language` → indépendant
- [ ] `npm run test` & `npm run cypress:open` passe

---

---

## 🚀 Sprint 3 : Landing, Monétisation & Launch

**Objectif** : Finalisations marketing et modèle commercial pour le lancement v1.4.

**Dépendance** : Sprint 1 & 2 doivent être complétés.

### Features

#### 3.1 Landing Page Modale d'Annonce v1.4
- [ ] Créer composant `Modal` / `Banner` animée
- [ ] Affichage auto à première visite (sauvegarde `localStorage`)
- [ ] **Titre** : *"Erudia fait sa peau neuve ! 🦉"*
- [ ] **Message** : *"Nous faisons évoluer Erudia pour vous offrir une expérience plus simple, plus ludique et 100% axée sur le plaisir de jouer ! La version 1.4 arrive très bientôt avec un format repensé, un essai gratuit de 7 jours et de tout nouveaux quiz sur le Monde, l'Espace, les Dinosaures et plus encore."*
- [ ] **CTA** : "Découvrir la nouvelle version en avant-première" (dirige vers app v1.4) + "Tester l'app actuelle" (v1.0)

**Critères d'acceptation** :
- Modale s'affiche une seule fois per browser (`localStorage`)
- Animation fluide, responsive mobile/desktop
- Boutons CTA fonctionnels

---

#### 3.2 Modèle Trial 7 Jours
- [ ] À l'inscription : `trial_ends_at = now() + 7 days`
- [ ] Dashboard : afficher "Essai expire dans X jours"
- [ ] Logique d'accès : `if (now() > trial_ends_at && !premium) → bloquer`
- [ ] Vérification à chaque launch quiz

**Critères d'acceptation** :
- Nouvel utilisateur a 7 jours d'accès gratuit
- Après 7 jours → accès bloqué (voir paywall)
- Dashboard affiche compte à rebours

---

#### 3.3 Paywall Gracieux & Redirection Stripe
- [ ] Message paywall non-punitif : *"Ton essai gratuit a expiré. Rejoins Premium pour continuer à jouer !"*
- [ ] Bouton → Stripe Checkout (pré-configuré)
- [ ] Après paiement → mise à jour `premium = true` en DB
- [ ] Redirect → Dashboard app immédiatement

**Critères d'acceptation** :
- Paywall s'affiche après expiration trial
- Stripe Checkout intégré et testé
- Post-paiement : accès Premium restauré

---

#### 3.4 Mise à Jour Landing Page & Textes Marketing
- [ ] Grilles tarifaires : afficher Trial 7j + Premium plan
- [ ] Copy : aligner sur "100% Plaisir, Culture Générale Amusante"
- [ ] Visuels : 5 catégories v1.4 + mascotte Nova
- [ ] FAQ : "Puis-je changer la langue de l'interface indépendamment des questions ?" → Oui ✓

**Critères d'acceptation** :
- Landing page reflète v1.4 (5 catégories, trial, premium)
- Copy marketing cohérent & attractif
- Aucun texte v1.0 (multijoueur, FLE, etc.)

---

### Definition of Done (Sprint 3)
- [ ] Modale annonce v1.4 affichée (localStorage ok)
- [ ] Trial 7j fonctionne (inscription → `trial_ends_at` set)
- [ ] Paywall redirige vers Stripe Checkout
- [ ] Landing page updatée (tarifs, copy, visuels v1.4)
- [ ] Post-lancement : aucune erreur de type, build ok

---

---

## 📊 Summary Table

| Sprint | Focus | Key Deliverables | Duration (est.) |
|--------|-------|------------------|-----------------|
| **Sprint 1** | Foundation | 5 catégories JSON + DB purge + Type Category réduit | 1-2 semaines |
| **Sprint 2** | Gameplay & Gamification | 10Q sessions + Timer + Progression + 25 Badges + Bilinguisme | 2-3 semaines |
| **Sprint 3** | Launch & Monetization | Landing modale + Trial + Paywall + Marketing finalisé | 1-2 semaines |

**Total estimé** : 4-7 semaines jusqu'à launch v1.4 ✓

---

## 🎯 Definition of Done Global (Acceptance Criteria)

Quand tous les sprints sont complétés, ces critères doivent être satisfaits :

1. ✓ Utilisateur peut lancer quiz 10 questions sur l'une des 5 catégories (FR ou EN)
2. ✓ Langue UI ≠ Langue questions (découplées indépendamment) — Dashboard
3. ✓ Barre temps s'écoule sans crash
4. ✓ Trial 7j verrouille accès après expiration
5. ✓ `npm run test` & `npm run cypress:open` passe
6. ✓ `npm run build` → zéro erreur TypeScript/render

---

## 🔄 Next Steps

1. **Immédiat** : Valider répartition Sprint 1-3 avec Johan
2. **Sprint 1 Start** : Générer 4 catégories JSON manquantes (Culture, Sciences, Dinosaures, Espace)
3. **Parallel** : Exécuter migration Supabase purge v1.0
4. **Sprint 2 Start** : Adapter `quizStore` pour 10 questions + Timer + Progression
5. **Sprint 3 Start** : Landing modale + Trial + Paywall (une fois S1+S2 quasi finis)
