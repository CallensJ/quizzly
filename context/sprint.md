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

**Dépendance** : Sprint 1 doit être complété.

### Features

#### 2.1 Sessions Strictes de 10 Questions
- [ ] Adapter `quizStore` pour charger **exactly 10 questions** par session (vs 20 actuellement)
- [ ] Vérifier que le loader de questions respecte le limit
- [ ] Tester avec chaque catégorie / niveau

**Critères d'acceptation** :
- Chaque quiz lancé affiche 10 questions exactement
- Pas de dépassement ni sous-tirage
- Tous les niveaux (easy/medium/hard) respectent le limit

---

#### 2.2 Timer Visuel (Barre de Temps)
- [ ] Créer composant `QuestionTimer` (barre fluide SCSS)
- [ ] 15-20 secondes par question (config adjustable)
- [ ] À la fin du timer : question comptée fausse, passage suivant auto
- [ ] Affichage par question (réinitialisation à chaque nouvelle)

**Critères d'acceptation** :
- Timer affiché et visible pour chaque question
- Décompte fluide (pas saccadé)
- Timeout → question automatiquement fausse
- Pas de crash state/store lors du passage question

---

#### 2.3 Progression de Difficulté (Règles Auto)
- [ ] **Promotion Facile → Moyen** : Score ≥80% sur 3 parties consécutives
- [ ] **Promotion Moyen → Difficile** : Score ≥90% sur 3 parties consécutives
- [ ] **Rétrogradation bienveillante** : Score <40% sur 2 parties → proposition douce
- [ ] Stocker état progression par (user_id, category, level)
- [ ] Modale célébration + mascotte Nova à chaque promotion

**Critères d'acceptation** :
- Système suit règles de promotion
- Rétrogradation bienveillante propose changement de niveau
- Validation : parcourir progression complète (easy → moyen → difficile) en test

---

#### 2.4 Gamification & Badges (5 par Catégorie = 25 Total)
- [ ] Badge 1 : *Première partie terminée* (Débutant)
- [ ] Badge 2 : *Score parfait 10/10* (Sans Faute)
- [ ] Badge 3 : *Déblocage niveau Moyen* (Explorateur)
- [ ] Badge 4 : *Déblocage niveau Difficile* (Expert)
- [ ] Badge 5 : *Série 5 jours consécutifs* (Persévérance) — utilise streak system
- [ ] Intégrer mascotte Nova pour célébrations
- [ ] Dashboard : affichage collection de badges

**Critères d'acceptation** :
- 25 badges débloquables (5×5 catégories)
- Chaque badge déclenche modale célébration + Nova
- Badges visibles au Dashboard / Profile
- Streak système fonctionne (reconduire depuis fin partie)

---

#### 2.5 Bilinguisme Découplé (Language Independence)
- [ ] Ajouter deux colonnes `user_profiles` : `interface_language`, `quiz_language` (remplacer ancien `language`)
- [ ] Navbar language switcher → change **only** `interface_language`
- [ ] Dashboard language selectors → **two independent dropdowns** (interface + questions)
- [ ] Loader questions : utiliser `quiz_language` au lieu de `language`
- [ ] Tous textes UI : utiliser `interface_language`

**Migrations Supabase** :
```sql
ALTER TABLE user_profiles 
  ADD COLUMN interface_language VARCHAR(2) DEFAULT 'fr',
  ADD COLUMN quiz_language VARCHAR(2) DEFAULT 'fr';

-- Copy old language → both new columns, then drop old
UPDATE user_profiles SET interface_language = language, quiz_language = language WHERE language IS NOT NULL;
ALTER TABLE user_profiles DROP COLUMN language;
```

**Critères d'acceptation** :
- Interface EN, Questions FR (et autres combos) fonctionnent
- Navbar switcher change interface seulement
- Dashboard offre 2 sélecteurs indépendants
- i18n system utilise `interface_language` pour textes

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
