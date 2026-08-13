# Instructions for Claude Code — Erudia (v1.4)

Welcome! Before taking any action, writing code, or modifying files, **you must read and comply with the project documentation located in the `/context/` directory**.

---

## 📚 Essential Project Documentation

Please inspect the following files to understand the project requirements, strategy, technical architecture, and active tasks:

### 1. Specifications & Brand Strategy
* **`context/strategie-de-marque.md`**
  - Brand positioning, mission, vision, core values, and target personas (Kids 6–11 vs. Parents).
  - Shift from academic/FLE v1.0 to a "100% fun & autonomy" general knowledge quiz.

* **`context/cahier-des-charges-claude-v1.4.md`**
  - Authoritative v1.4 specification: landing page announcement modal, the 5 official categories,
    difficulty promotion/demotion thresholds, visual timer behaviour, the 25 badges,
    decoupled bilingual settings, and the 7-day trial model.

### 2. Context Navigation (`/context/` directory)
* **`context/project-overview.md`**
  - High-level project summary, business goals, target audience, technical stack (Next.js 16, Supabase, Stripe, Zustand, etc.), and subscription model.

* **`context/ai-interaction.md`**
  - Communication rules, work methodology, git/commit standards, and strict limits on autonomous modifications.
  - **Crucial Rule**: Always ask for Johan's explicit approval before modifying database schemas (Supabase), global state architecture (Zustand), or billing logic (Stripe).

* **`context/coding-standards.md`**
  - TypeScript strictness, Next.js App Router patterns, Zustand store practices, data model formats, and UI/UX guidelines tailored for kids aged 6–11.

* **`context/current-feature.md`**
  - **Start here for active sprint tasks**.
  - Contains the step-by-step checklist for the v1.4 migration and the definition of done.

---

## 🎯 Core Guidelines Summary

- **Language**: Communicate in French.
- **Scope**: Keep changes minimal, targeted, and well-tested. Never execute a broad refactoring unless explicitly instructed.
- **Build & Test**: Always verify that `npm run test` and `npm run build` pass before marking a task as complete.
- **System Integrity**: Align all technical execution strictly with the provided documentation.
