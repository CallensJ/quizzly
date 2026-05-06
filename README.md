# Erudia — Application éducative

> Plateforme de quiz éducatifs et ludiques pour les **enfants de 6 à 11 ans**.  
> Bilingue FR / EN · Abonnement Stripe · Tests unitaires + E2E · CI/CD.

[![Live](https://img.shields.io/badge/Live-app.erudia.app-4FC08D?style=flat&logo=vercel&logoColor=white)](https://app.erudia.app)
[![Landing](https://img.shields.io/badge/Landing-erudia.app-B9765C?style=flat&logo=vercel&logoColor=white)](https://erudia.app/fr)
![TypeScript](https://img.shields.io/badge/TypeScript-62.9%25-3178C6?style=flat&logo=typescript&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-23.8%25-CC6699?style=flat&logo=sass&logoColor=white)
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
│   ├── data/questions/     # JSON fallback FR/EN par catégorie
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

## 📚 Contenu disponible

| Catégorie | Tier | Questions |
|-----------|------|-----------|
| Sciences | Gratuit | 300 FR + 300 EN |
| Histoire | Gratuit | 500 FR + 500 EN |
| Héros & Aventures | Gratuit | 75 FR + 75 EN |
| Géographie | Premium | À venir |
| Espace & Astronomie | Premium | À venir |
| Mythologie | Premium | À venir |
| Mathématiques | Premium | À venir |
| Éducation Civique | Premium | À venir |
| Cuisine | Premium | À venir |

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
