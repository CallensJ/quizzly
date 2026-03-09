'use client';

/**
 * src/components/features/home/HomeScreen.tsx
 *
 * Écran d'accueil post-onboarding.
 * Permet de choisir une catégorie (sciences / histoire) et une difficulté,
 * puis de lancer une partie via le bouton "Jouer !".
 *
 * Flux : sélection catégorie + difficulté → chargement JSON → startQuiz() → /quiz
 * Le bouton "Jouer !" reste désactivé tant que les deux sélections ne sont pas faites.
 */

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Atom, Landmark, User } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useQuizStore } from '@/stores/quizStore';
import type { Category, Difficulty, Locale, QuestionFile } from '@/types';

// Métadonnées des catégories MVP 1
const CATEGORIES: { id: Category; icon: React.ReactNode; colorVar: string }[] = [
  {
    id: 'sciences',
    icon: <Atom size={40} strokeWidth={1.5} />,
    // Variable CSS définie dans _tokens.scss
    colorVar: 'var(--color-cat-science)',
  },
  {
    id: 'histoire',
    icon: <Landmark size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-history)',
  },
];

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

// Lookup statique des imports JSON — évite les template literals dans import()
// qui peuvent poser problème selon le bundler.
const QUESTION_LOADERS: Record<Locale, Record<Category, () => Promise<{ default: QuestionFile }>>> = {
  fr: {
    sciences: () => import('@/data/questions/fr/sciences.json') as Promise<{ default: QuestionFile }>,
    histoire: () => import('@/data/questions/fr/histoire.json') as Promise<{ default: QuestionFile }>,
  },
  en: {
    sciences: () => import('@/data/questions/en/sciences.json') as Promise<{ default: QuestionFile }>,
    histoire: () => import('@/data/questions/en/histoire.json') as Promise<{ default: QuestionFile }>,
  },
};

export default function HomeScreen() {
  const t = useTranslations('home');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const profile = useProfileStore((s) => s.profile);
  const { category, difficulty, setCategory, setDifficulty, startQuiz } = useQuizStore();

  const [loading, setLoading] = useState(false);

  const canPlay = category !== null && difficulty !== null;

  async function handlePlay() {
    if (!canPlay || loading) return;

    setLoading(true);
    try {
      const mod = await QUESTION_LOADERS[locale][category!]();
      const allQuestions = mod.default.questions;
      // Filtre par difficulté sélectionnée
      const pool = allQuestions.filter((q) => q.difficulty === difficulty);
      startQuiz(pool);
      router.push('/quiz');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home">

      {/* ── Barre de navigation ────────────────────────────────────────────── */}
      <header className="home__header">
        <h1 className="home__greeting">
          {/* Salutation personnalisée avec le pseudo */}
          Salut, <span>{profile?.pseudo}</span> !
        </h1>
        <button
          className="home__profile-btn"
          onClick={() => router.push('/profile')}
          aria-label="Voir mon profil"
        >
          <User size={28} strokeWidth={2} />
        </button>
      </header>

      <main className="home__body">

        {/* ── Catégories ────────────────────────────────────────────────────── */}
        <section className="home__section">
          <h2 className="home__section-title">{t('title')}</h2>
          <div className="home__categories">
            {CATEGORIES.map(({ id, icon, colorVar }) => (
              <button
                key={id}
                type="button"
                data-testid={`cat-${id}`}
                className={`home__cat-card${category === id ? ' home__cat-card--active' : ''}`}
                style={{ '--cat-color': colorVar } as React.CSSProperties}
                onClick={() => setCategory(id)}
                aria-pressed={category === id}
              >
                <span className="home__cat-icon">{icon}</span>
                <span className="home__cat-name">{t(id)}</span>
                <span className="home__cat-desc">{t(`${id}Desc`)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Difficulté ────────────────────────────────────────────────────── */}
        <section className="home__section">
          <h2 className="home__section-title">{t('difficultyLabel')}</h2>
          <div className="home__difficulties">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                data-testid={`diff-${d}`}
                className={`home__diff-btn home__diff-btn--${d}${difficulty === d ? ' home__diff-btn--active' : ''}`}
                onClick={() => setDifficulty(d)}
                aria-pressed={difficulty === d}
              >
                {t(d)}
              </button>
            ))}
          </div>
        </section>

        {/* ── CTA Play ──────────────────────────────────────────────────────── */}
        <button
          type="button"
          data-testid="play-btn"
          className="home__cta"
          disabled={!canPlay || loading}
          onClick={handlePlay}
        >
          {loading ? '…' : t('ctaPlay')}
        </button>

      </main>
    </div>
  );
}
