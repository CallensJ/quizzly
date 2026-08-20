# 🎯 Feuille de Route & Spécifications de Refonte — Erudia (v1.4)

> **Document destiné à l'agent IA / développeur (Claude Code)** > Ce document cadre les choix stratégiques, les modifications produit et la transition technique vers la v1.4 d'Erudia.

---

## 1. Stratégie de Transition : Landing Page & Maintenance

### Option retenue : Modale d'Annonce sur la Landing Page (Pas de mode "En maintenance")
Afin de ne pas tuer le référencement (SEO) ni bloquer la découverte de l'application, la landing page reste active avec l'intégration d'une **modale d'information dynamique** (Banner / Modal de Redirection v1.4).

- **Comportement de la modale** :
  - S'affiche automatiquement à la première visite (sauvegardé via `localStorage`).
  - **Titre** : *Erudia fait sa peau neuve ! 🦉*
  - **Message principal** :
    > "Nous faisons évoluer Erudia pour vous offrir une expérience plus simple, plus ludique et 100% axée sur le plaisir de jouer ! La version 1.4 arrive très bientôt avec un format repensé, un essai gratuit de 7 jours et de tout nouveaux quiz sur le Monde, l'Espace, les Dinosaures et plus encore."
  - **Bouton d'action (CTA)** : *"Découvrir la nouvelle version en avant-première"* (revisite le contenu mis à jour) ou *"Tester l'app actuelle"*.

---

## 2. Sélection des 5 Catégories de Lancement (v1.4)

Les 5 catégories officielles retenues pour la v1.4 sont :

1. 📜 **Histoire du Monde** (Grandes civilisations, inventions, événements mondiaux — fin du centrage France).
2. 💡 **Culture Générale** (Questions variées, funs, anecdotes passionnantes et divertissantes).
3. 🔬 **Sciences & Nature** (Corps humain, physique amusante, phénomènes naturels, plantes).
4. 🦖 **Dinosaures & Préhistoire** (Périodes, fossiles, espèces célèbres, mode de vie des dinosaures).
5. 🚀 **Espace & Astronomie** (Système solaire, planètes, conquête spatiale, étoiles).

*Note : Chaque catégorie contiendra exactement **200 questions en Français** et **200 questions en Anglais** (400 questions au total par catégorie).*

**Note (2026-08-19) — 200 est une base de lancement, pas un plafond.** Une fois
l'app en usage réel, le volume par catégorie/langue augmentera probablement
pour prolonger la durée de vie du contenu. Tant que ça reste de l'ordre de
quelques passes supplémentaires (ex. 200 → 400), la même méthode suffit :
prompt Gemini (`scripts/questions/prompt_generation.md`) + scripts de contrôle
qualité existants (`scripts/questions/globaux/`) + import via
`scripts/migrate-questions.ts`. Si le volume ou la fréquence de génération
grossit nettement au-delà (contenu généré en continu, plusieurs contributeurs,
génération à la demande), ce pipeline manuel deviendra le goulot
d'étranglement — il sera alors temps d'envisager une API dédiée à la
génération/validation de contenu plutôt que du copier-coller. Pas un chantier
actuel, juste à garder en tête pour ne pas être surpris le jour où le manuel
ne suffit plus.

---

## 3. Définition Technique Détaillée de la Progression en Difficulté

Le système gère la difficulté de manière **autonome, transparente et bienveillante** pour chaque profil utilisateur.

### 3.1. Niveaux Disponibles
- **Facile** (Niveau par défaut lors de l'inscription / lancement d'une catégorie).
- **Moyen**
- **Difficile**

### 3.2. Règles de Promotion (Montée en niveau)
- **Facile → Moyen** :
  - **Condition** : L'utilisateur doit valider un score $\ge 80\%$ (8/10 ou +) sur **3 parties consécutives** terminées dans la même catégorie.
  - **Feedback UI** : Modale/Pop-up félicitant l'enfant avec la mascotte Nova (*"Bravo ! Tu as débloqué le niveau Moyen pour cette catégorie !"*).
- **Moyen → Difficile** :
  - **Condition** : L'utilisateur doit valider un score $\ge 90\%$ (9/10 ou 10/10) sur **3 parties consécutives** en niveau Moyen dans la même catégorie.
  - **Feedback UI** : Animation de célébration et badge de maîtrise débloqué.

### 3.3. Règles de Rétrogradation Bienveillante (Ajustement vers le bas)
- **Condition** : Si l'utilisateur réalise un score $< 40\%$ (3/10 ou moins) sur **2 parties consécutives** au niveau Moyen ou Difficile.
- **Feedback UI** : Proposition douce sans punition (*"Ces questions sont un peu dures ? Veux-tu qu'on réévise ensemble au niveau inférieur ?"*).

---

## 4. Spécifications du Gameplay & Gamification (v1.4)

- **Format des Quiz** : **10 questions par session** (durée estimée : 2 à 3 minutes).
- **Timer Visuel** :
  - Barre de progression temporelle (15 à 20 secondes par question).
  - Diminution fluide (animation SCSS).
  - En cas de temps écoulé : la question est comptée fausse et l'application passe à la suite.
- **Badges de Catégorie** :
  - **5 badges par catégorie** (soit 25 badges à débloquer au total) :
    1. *Première partie terminée* (Badge Débutant).
    2. *Score parfait 10/10* (Badge Sans Faute).
    3. *Déblocage du Niveau Moyen* (Badge Explorateur).
    4. *Déblocage du Niveau Difficile* (Badge Expert).
    5. *Série de 5 jours consécutifs* (Badge Persévérance).

---

## 5. Paramètres Système, Langue & Modèle Freemium

- **Bilinguisme Découplé** :
  - Paramètre 1 : `interface_language` (FR/EN) → contrôle les libellés de l'UI.
  - Paramètre 2 : `quiz_language` (FR/EN) → sélectionne la base de questions.
  - Modifiable à tout moment dans le Dashboard.
- **Modèle Tarifaire (Trial 7 Jours)** :
  - À la création du compte, `trial_ends_at = current_date + 7 days`.
  - Accès illimité à l'ensemble des 5 catégories pendant 7 jours.
  - À l'expiration du trial : blocage gracieux redirigeant vers le checkout Stripe pour débloquer l'accès Premium.
