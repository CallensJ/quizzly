# Erudia — App

Application de quiz éducatif et ludique pour les **6–11 ans**.

Développé par [Johanwebstudio](https://johanwebstudio.com).

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript strict |
| Styles | SCSS (architecture 7-1, Dart Sass) |
| State | Zustand + persist (localStorage) |
| i18n | next-intl (FR / EN) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Animations | Framer Motion |
| Sons | Howler.js |
| Avatars | DiceBear |
| PDF | @react-pdf/renderer |
| Déploiement | Vercel |

---

## Lancer en local

```bash
npm install
npm run dev
```

Copier `.env.local.example` → `.env.local` et renseigner les variables Supabase.

---

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Structure

```
src/
├── app/[locale]/       # Pages (App Router + next-intl)
├── components/
│   ├── features/       # Composants métier par écran
│   ├── layout/         # AppLayout (sidebar desktop)
│   └── ui/             # Composants atomiques (Nova...)
├── stores/             # profileStore, quizStore, authStore
├── lib/                # questions, badges, daily, challenges, sync, report...
├── data/questions/     # JSON fallback fr/en par catégorie
├── messages/           # Traductions fr.json + en.json
├── styles/             # SCSS 7-1
└── types/              # Types TypeScript partagés
```

---

## Tests

```bash
npm run test          # Jest (tests unitaires)
npm run cypress:open  # Cypress (tests E2E)
```

CI automatique via GitHub Actions sur chaque push/PR.

---

## Catégories

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

## Liens

- App : [app.erudia.app](https://app.erudia.app)
- Landing : [erudia.app](https://erudia.app)
- Documentation : `documentations/`
