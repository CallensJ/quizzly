# Erudia (v1.4) - Project Overview

## Overview

Erudia est une application web progressive (PWA) de quiz de culture générale 100 % plaisir pour les enfants de 6 à 11 ans.  
Initialement conçue comme une plateforme éducative rigide liée aux programmes scolaires et au FLE/CECRL (v1.0 avec +21 000 questions sur 21 catégories), l'application opère un **pivot stratégique vers la version 1.4**.

La v1.4 se concentre sur une expérience épurée, fluide et hautement captivante : moins de surcharge, un contenu révisé et irréprochable, et un positionnement centré sur l'autonomie et le divertissement intelligent.

- **Landing page public** : `https://erudia.app`
- **Application Web** : `https://app.erudia.app`
- **Slogan** : *"L'application de quiz que vos enfants ouvrent pour s'amuser, et qu'ils gardent parce qu'ils apprennent."*  ( slogan a revoir )

---

## Strategic Goals (v1.4 Pivot)

1. **Simplicité et plaisir d'abord** : L'apprentissage est un effet secondaire positif du jeu, sans pression scolaire.
2. **Réduction de la charge opérationnelle** : Passage de 21 catégories diluées à **5 univers phares** ultra-qualitatifs.
3. **Monétisation fluide** : Abandon du mode gratuit restreint par catégorie au profit d'un **essai gratuit complet de 7 jours**, suivi du passage en Premium.
4. **Sécurité & Sérénité** : 0 publicité, 0 achat impulsif, conformité COPPA/RGPD et fonctionnement *Offline-first*.

---

## Target Audience & Personas

* **L'Utilisateur (L'enfant de 6 à 11 ans)** : Curieux, cherche à battre son propre score, débloquer des badges et faire grandir sa série (streak).
* **L'Acheteur (Le parent)** : Cherche une alternative saine et sécurisée au temps d'écran passif (YouTube Kids, jeux d'arcade bourrés de pubs), utilisable partout (trajets, voiture, vacances, hors-ligne).

---

## Core Product Features (v1.4)

### 1. Categories & Question Volume
- **5 Catégories de lancement**:
  1.  *Histoire du Monde* (Perspective globale/civilisations, arrêt du centrage exclusif sur la France).
  2. 💡 *Culture Générale* (Anecdotes funs et curiosités).
  3. 🔬 *Sciences & Nature* (Phénomènes amusants, corps humain, physique).
  4. 🦖 *Dinosaures & Préhistoire* (Périodes, fossiles, créatures).
  5. 🚀 *Espace & Astronomie* (Système solaire, planètes, conquête spatiale).
- **Volume par catégorie** : 200 questions en Français + 200 questions en Anglais (**400 questions / catégorie**, soit 2 000 questions parfaitement calibrées pour la v1.4).

### 2. Gameplay & Gamification
- **Sessions courtes** : 10 questions par partie (durée de 2 à 3 min).
- **Timer Visuel** : Barre de temps dynamique par question.
- **Badges** : 5 badges exclusifs à débloquer par catégorie (25 badges au total).
- **Progression en difficulté** : Niveaux *Facile*, *Moyen*, *Difficile* basés sur la réussite répétée ($\ge 80\%$ pour monter) avec rétrogradation bienveillante.

### 3. Decoupled Bilingual System
- Découplage strict entre la langue de l'interface (`FR` / `EN`) et la langue des quiz (`FR` / `EN`), modifiable dans le Dashboard parental.

---

## Tech Stack

| Domain | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript strict |
| **Styling** | SCSS (architecture 7-1, Dart Sass) |
| **State** | Zustand + persist |
| **i18n** | next-intl (FR / EN) |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions) |
| **Payment** | Stripe (Trial 7 jours + abonnement récurrent) |
| **Animations** | Framer Motion |
| **Audio** | Howler.js |
| **Avatars** | DiceBear |
| **Hosting** | Vercel |

---

## Business & Subscription Model

- **Essai Gratuit (Trial)** : 7 jours d'accès complet et illimité à l'intégralité de l'application dès la création de profil.
- **Premium (Post-Trial)** : Passage obligatoire à l'abonnement Stripe (mensuel/annuel) pour continuer de jouer après les 7 jours.
