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

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Atom, Landmark, Swords, User, Lock,
  Trophy, Globe, Palette, Film, Scale,
  Calculator, ChefHat, Cpu, Sparkles, Rocket, BookA,
} from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useQuizStore } from '@/stores/quizStore';
import { fetchQuestions } from '@/lib/questions';
import type { Category, Difficulty, Locale } from '@/types';

// Catégories jouables — questions disponibles (gratuites)
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

// Catégories premium verrouillées — UI uniquement, pas de questions pour l'instant (MVP 4)
const PREMIUM_CATEGORIES: { i18nKey: string; icon: React.ReactNode; colorVar: string }[] = [
  { i18nKey: 'sport',          icon: <Trophy    size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-sport)' },
  { i18nKey: 'geographie',     icon: <Globe     size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-geography)' },
  { i18nKey: 'art',            icon: <Palette   size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-art)' },
  { i18nKey: 'culturePop',     icon: <Film      size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-culture)' },
  { i18nKey: 'civique',        icon: <Scale     size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-civique)' },
  { i18nKey: 'mathematiques',  icon: <Calculator size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-maths)' },
  { i18nKey: 'cuisine',        icon: <ChefHat   size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-cuisine)' },
  { i18nKey: 'technologie',    icon: <Cpu       size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-techno)' },
  { i18nKey: 'mythologie',     icon: <Sparkles  size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-mythologie)' },
  { i18nKey: 'espace',         icon: <Rocket    size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-espace)' },
];

// Section spéciale "Langues" — deux sous-cartes verrouillées (Français + Anglais)
const LANGUE_CATEGORIES: { i18nKey: string; icon: React.ReactNode; colorVar: string }[] = [
  { i18nKey: 'langueFr', icon: <BookA size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-langue-fr)' },
  { i18nKey: 'langueEn', icon: <BookA size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-langue-en)' },
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

  // Ref sur le CTA "Jouer !" — pour le scroll automatique sur mobile
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Scroll vers le bouton "Jouer !" dès qu'une catégorie est choisie (mobile uniquement)
  // Sur desktop le CTA est sticky dans le panneau droit, pas besoin de scroller.
  useEffect(() => {
    if (category !== null && ctaRef.current && window.innerWidth < 1024) {
      ctaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [category]);

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

        {/* ── Catégories gratuites ──────────────────────────────────────────── */}
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

        {/* ── Catégories premium verrouillées ───────────────────────────────── */}
        <section className="home__section">
          <div className="home__section-header">
            <h2 className="home__section-title">{t('premiumTitle')}</h2>
            {/* Badge "Premium" visuel — indique clairement le contenu payant */}
            <span className="home__premium-tag">{t('premiumTag')}</span>
          </div>
          <div className="home__categories">
            {PREMIUM_CATEGORIES.map(({ i18nKey, icon, colorVar }) => (
              // div non-interactive — les catégories premium ne sont pas jouables (MVP 4)
              <div
                key={i18nKey}
                className="home__cat-card home__cat-card--locked"
                style={{ '--cat-color': colorVar } as React.CSSProperties}
                aria-label={`${t(i18nKey)} — ${t('premiumLocked')}`}
              >
                <span className="home__cat-icon">{icon}</span>
                <span className="home__cat-name">{t(i18nKey)}</span>
                {/* Overlay cadenas — repositionné en absolu sur la carte */}
                <span className="home__cat-lock" aria-hidden="true">
                  <Lock size={18} strokeWidth={2.5} />
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section spéciale Langues (premium) ───────────────────────────── */}
        <section className="home__section home__section--langues">
          <div className="home__section-header">
            <h2 className="home__section-title">{t('languesTitle')}</h2>
            <span className="home__premium-tag">{t('premiumTag')}</span>
          </div>
          <div className="home__langues">
            {LANGUE_CATEGORIES.map(({ i18nKey, icon, colorVar }) => (
              <div
                key={i18nKey}
                className="home__cat-card home__cat-card--locked home__cat-card--langue"
                style={{ '--cat-color': colorVar } as React.CSSProperties}
                aria-label={`${t(i18nKey)} — ${t('premiumLocked')}`}
              >
                <span className="home__cat-icon">{icon}</span>
                <span className="home__cat-name">{t(i18nKey)}</span>
                <span className="home__cat-lock" aria-hidden="true">
                  <Lock size={18} strokeWidth={2.5} />
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Panneau de contrôle : difficulté + play ──────────────────────── */}
        {/*
          Sur desktop, ce div devient une colonne sticky à droite du bento grid.
          Sur mobile, display:contents le "dissout" dans le flux flex du body.
        */}
        <div className="home__controls">

          {/* Difficulté */}
          <section className="home__section home__section--difficulty">
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

          {/* CTA Play */}
          <button
            ref={ctaRef}
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

        </div>

      </main>
    </div>
  );
}
