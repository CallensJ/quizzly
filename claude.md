# Instructions for Claude Code — Erudia (v1.4)

Welcome! Before taking any action, writing code, or modifying files, **you must read and comply with the project documentation located in the `/context/` directory**.

> 📚 **Documentation split (reorganized 2026-08-28)**: `/context/` now holds **only** the
> operational docs Claude Code reads/writes while working in *this* repo. Everything else —
> brand strategy, v2 visual identity, landing content/copy, the trial flow spec — lives in the
> sibling doc repo **`../../Erudia_docs/`** (relative to this repo's root). See
> `../../Erudia_docs/README.md` for the full index. Don't go looking for `strategie-de-marque.md`
> or `cahier-des-charges-claude-v1.4.md` in `/context/` anymore — they moved (see below).

---

## 📚 Essential Project Documentation

### 1. `/context/` — operational docs for this repo (the only files that stay here)

* **`context/project-overview.md`**
  - High-level project summary, business goals, target audience, technical stack (Next.js 16, Supabase, Stripe, Zustand, etc.), subscription model, and a "Historique de cadrage" section absorbing the old cahier des charges.

* **`context/current-feature.md`**
  - **Start here for active sprint tasks**. High-level status of the v1.4 migration and its definition of done; defers to `sprint.md` for sprint-by-sprint detail.

* **`context/sprint.md`**
  - Sprint-by-sprint breakdown (Sprint 1/2/3), the document of record for what's actually done vs. remaining.

* **`context/ai-interaction.md`**
  - Communication rules, work methodology, git/commit standards, and strict limits on autonomous modifications.
  - **Crucial Rule**: Always ask for Johan's explicit approval before modifying database schemas (Supabase), global state architecture (Zustand), or billing logic (Stripe).

* **`context/coding-standards.md`**
  - TypeScript strictness, Next.js App Router patterns, Zustand store practices, data model formats, and UI/UX guidelines tailored for kids aged 6–11.

### 2. `../../Erudia_docs/` — strategy & content, shared with `Erudia-landing`

* **`shared/strategie-de-marque.md`** — brand positioning, mission, vision, values, personas (Kids 6–11 vs. Parents). Valid across both v1.4 and v2, not version-scoped.
* **`shared/identite-visuelle-v2.md`** — target v2 visual identity (palette, Nunito typography, Phosphor Icons for generic UI, bespoke SVG for brand elements, "claymorphism" style). Describes a **future** redesign, not the app as currently coded — see scope boundary below.
* **`shared/trial-flow-v1.4.md`** — the 7-day trial architecture (anonymous Supabase session, 7d + consumption cap, 3-stage non-blocking frontend behavior). **Source of truth for the trial** — supersedes the "at signup" description still in `sprint.md`/`current-feature.md` until that work is recoded.
* **`shared/mecaniques-a-expliquer.md`** — product mechanics likely to confuse a player/parent (per-category difficulty unlock, decoupled UI/quiz language, badge count) — feeds landing FAQ copy.
* **`landing/`** — `Erudia-landing`-specific content audit, copy, sitemap, content strategy, v2 palette mapping for the landing's SCSS tokens.

### 3. `context/version2/design/` — NOT in scope yet
* High-fidelity mockups (`erudia-dashboard.html`, `erudia-jouer.html`) that `Erudia_docs/shared/identite-visuelle-v2.md` was derived from.
* **⚠️ These describe a future UX/UI redesign (v2), currently in preparation by Johan. They do NOT
  describe the app as currently coded, and must NOT be treated as a spec for any v1.4 task.**

---

## 🎯 Core Guidelines Summary

- **Language**: Communicate in French.
- **Scope**: Keep changes minimal, targeted, and well-tested. Never execute a broad refactoring unless explicitly instructed.
- **v1.4 scope boundary**: the current v1.4 milestone covers **content and positioning only** (categories, questions, gamification, trial/pricing, marketing copy) — **no UI/UX redesign work**. Do not use anything under `context/version2/` to justify visual or component changes on a v1.4 task, even if it looks like an improvement. If a task seems to call for a v2-style change, stop and ask Johan first — it's likely out of scope.
- **Build & Test**: Always verify that `npm run test` and `npm run build` pass before marking a task as complete.
- **System Integrity**: Align all technical execution strictly with the provided documentation.
