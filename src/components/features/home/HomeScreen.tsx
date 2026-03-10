'use client';

/**
 * src/components/features/home/HomeScreen.tsx
 *
 * Écran d'accueil post-onboarding.
 * Permet de choisir une catégorie (sciences / histoire / heroes) et une difficulté,
 * puis de lancer une partie via le bouton "Jouer !".
 *
 * Flux : sélection catégorie + difficulté → chargement JSON → startQuiz() → /quiz
 * Le bouton "Jouer !" reste désactivé tant que les deux sélections ne sont pas faites.
 */

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Atom, Landmark, Swords, User } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useQuizStore } from '@/stores/quizStore';
import { fetchQuestions } from '@/lib/questions';
import type { Category, Difficulty, Locale } from '@/types';

// Métadonnées des catégories — 1 entrée par catégorie disponible
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
  {
    id: 'heroes',
    icon: <Swords size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-heroes)',
  },
];

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export default function HomeScreen() {
  const t = useTranslations('home');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  // Toggle FR ↔ EN — même pattern que ProfileScreen
  function toggleLocale() {
    const next: Locale = locale === 'fr' ? 'en' : 'fr';
    router.replace(pathname, { locale: next });
  }

  const profile = useProfileStore((s) => s.profile);
  const { category, difficulty, setCategory, setDifficulty, startQuiz } = useQuizStore();

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const canPlay = category !== null && difficulty !== null;

  async function handlePlay() {
    if (!canPlay || loading) return;

    setLoading(true);
    setFetchError(false);
    try {
      // Récupère les questions depuis Supabase (avec cache localStorage 24h + fallback offline)
      const pool = await fetchQuestions(category!, locale as Locale, difficulty!);
      startQuiz(pool);
      router.push('/quiz');
    } catch {
      // Échec réseau sans cache — affiche un message d'erreur à l'utilisateur
      setFetchError(true);
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
        <div className="home__header-actions">
          {/* Toggle langue — accessible directement depuis le header pour les enfants */}
          <button
            className="home__lang-btn"
            onClick={toggleLocale}
            aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en français'}
          >
            {locale === 'fr' ? '🇬🇧' : '🇫🇷'}
          </button>
          <button
            className="home__profile-btn"
            onClick={() => router.push('/profile')}
            aria-label="Voir mon profil"
          >
            <User size={28} strokeWidth={2} />
          </button>
        </div>
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

        {/* Erreur chargement questions (pas de réseau + pas de cache) */}
        {fetchError && (
          <p className="home__fetch-error" role="alert">{t('fetchError')}</p>
        )}

      </main>
    </div>
  );
}
