# Erudia — Application éducative

> Plateforme de quiz éducatifs et ludiques pour les **enfants de 6 à 11 ans**.  
> Bilingue FR / EN · **21 558 questions** · Abonnement Stripe · Tests unitaires + E2E · CI/CD.

[![Live](https://img.shields.io/badge/Live-app.erudia.app-4FC08D?style=flat&logo=vercel&logoColor=white)](https://app.erudia.app)
[![Landing](https://img.shields.io/badge/Landing-erudia.app-B9765C?style=flat&logo=vercel&logoColor=white)](https://erudia.app/fr)
![TypeScript](https://img.shields.io/badge/TypeScript-62.9%25-3178C6?style=flat&logo=typescript&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-23.8%25-CC6699?style=flat&logo=sass&logoColor=white)
![Questions](https://img.shields.io/badge/Questions-21%20558-F59E0B?style=flat)
![Commits](https://img.shields.io/github/commit-activity/t/CallensJ/quizzly?label=commits&color=88CE02)
![CI](https://img.shields.io/github/actions/workflow/status/CallensJ/quizzly/ci.yml?label=CI&logo=githubactions&logoColor=white)

---

## 🚀 Stack

| Catégorie | Technologie |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Langage | TypeScript strict |
| Styling | SCSS (architecture 7-1, Dart Sass) |
| State | Zustand + persist |
| i18n | next-intl (FR / EN) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Paiement | Stripe (abonnements récurrents) |
| Animations | Framer Motion |
| Audio | Howler.js |
| Avatars | DiceBear |
| PDF | @react-pdf/renderer |
| Scripts | Python (génération de contenu) |
| Déploiement | Vercel |

---

## 📁 Architecture

```
quizzly/
├── src/
│   ├── app/[locale]/       # Pages (App Router + next-intl)
│   ├── components/
│   │   ├── features/       # Composants métier par écran
│   │   ├── layout/         # AppLayout (sidebar desktop)
│   │   └── ui/             # Composants atomiques
│   ├── stores/             # profileStore · quizStore · authStore (Zustand)
│   ├── lib/                # questions, badges, daily, challenges, sync, report
│   ├── data/questions/     # 21 558 questions JSON — FR/EN par catégorie
│   ├── messages/           # Traductions fr.json + en.json
│   ├── styles/             # SCSS 7-1
│   └── types/              # Types TypeScript partagés
├── supabase/               # Edge Functions + migrations
├── scripts/                # Scripts Python — génération de questions
├── cypress/                # Tests E2E
└── .github/                # CI/CD GitHub Actions
```

---

## ✨ Features

- **Quiz adaptatifs** par niveau, catégorie et langue
- **Authentification complète** — Supabase Auth (inscription, connexion, gestion de compte)
- **Abonnements Stripe** — plans mensuel et annuel, gestion des accès premium
- **Espace enfant** — avatar DiceBear, progression, badges, défis quotidiens
- **Rapports PDF** — export de progression via @react-pdf/renderer
- **Effets sonores** — feedback audio Howler.js
- **Bilingue FR / EN** — next-intl, switch de langue en temps réel
- **CI/CD** — GitHub Actions sur chaque push/PR

---

## 📚 Contenu — 21 558 questions FR + EN

| Catégorie | FR | EN |
|-----------|-----|-----|
| Sciences | 376 | 900 |
| Histoire | 600 | 705 |
| Héros & Aventures | 600 | 600 |
| Animaux & Nature | 600 | 600 |
| Mathématiques | 900 | 900 |
| Français / Langue | 750 | 600 |
| Sport | 800 | 800 |
| Géographie | 900 | 600 |
| Anglais | 600 | 600 |
| Art | 584 | 554 |
| Corps humain | 600 | 600 |
| Cuisine | 600 | 600 |
| Dinosaures | 666 | 561 |
| Éducation civique | 600 | 600 |
| Environnement | 600 | — |
| Espace & Astronomie | 694 | — |
| Monde antique | 500 | 500 |
| Musique | 388 | — |
| Technologie | 480 | — |
| **Total** | **~10 838** | **~10 720** |

---

## 🧪 Tests

```bash
npm run test           # Jest — tests unitaires
npm run cypress:open   # Cypress — tests E2E
```

CI automatique via GitHub Actions sur chaque push/PR.

---

## ⚙️ Installation locale

```bash
git clone https://github.com/CallensJ/quizzly.git
cd quizzly
npm install
cp .env.local.example .env.local
npm run dev
```

Variables requises :

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## 🔗 Projet lié

| Repo | Description |
|------|-------------|
| [Erudia-landing](https://github.com/CallensJ/Erudia-landing) | Landing page Vue.js 3 · Resend · i18n FR/EN |

---

## 🌐 Live

- Application : [app.erudia.app](https://app.erudia.app/fr/home)
- Landing : [erudia.app](https://erudia.app/fr)

---

> Développé par [Johan Callens](https://github.com/CallensJ) · [JohanWebStudio](https://johanwebstudio.fr)
