'use client';

/**
 * src/components/features/daily/DailyScreen.tsx
 *
 * Écran du Mode Défi Quotidien.
 *
 * Structure :
 *   - header : gradient + titre "Défi du jour" + date du jour
 *   - corps  : streak + shields, XP + titre, infos du quiz (catégorie/difficulté)
 *   - CTA    : "Jouer" (désactivé si déjà joué) ou "Déjà complété" avec le score
 *
 * Flux :
 *   1. Chargement des questions via fetchQuestions()
 *   2. getDailyQuestions() → sélection seedée par la date
 *   3. startDailyQuiz() → /quiz
 *   Résultats gérés dans ResultsScreen (isDailyChallenge === true)
 */

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Atom, Landmark, Swords, Sun, Shield, Flame, ChevronRight } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import { useQuizStore } from '@/stores/quizStore';
import { fetchQuestions } from '@/lib/questions';
import {
  getDailyCategory,
  getDailyDifficulty,
  getDailyDateString,
  getDailyQuestions,
  getTitleForXp,
  TITLES,
} from '@/lib/daily';
import type { Locale } from '@/types';

// Icône selon la catégorie du jour
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  sciences: <Atom size={28} strokeWidth={1.5} />,
  histoire: <Landmark size={28} strokeWidth={1.5} />,
  heroes:   <Swords size={28} strokeWidth={1.5} />,
};

export default function DailyScreen() {
  const t       = useTranslations('daily');
  const tHome   = useTranslations('home');
  const locale  = useLocale() as Locale;
  const router  = useRouter();

  const profile        = useProfileStore((s) => s.profile);
  const dailyStreak    = useProfileStore((s) => s.dailyStreak);
  const dailyXp        = useProfileStore((s) => s.dailyXp);
  const dailyShields   = useProfileStore((s) => s.dailyShields);
  const dailyLastDate  = useProfileStore((s) => s.dailyLastDate);
  const dailyTodayScore = useProfileStore((s) => s.dailyTodayScore);

  const { startDailyQuiz } = useQuizStore();

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Vérifie si le défi du jour a déjà été joué
  const todayStr    = getDailyDateString();
  const alreadyPlayed = dailyLastDate === todayStr;

  const category   = getDailyCategory();
  const difficulty = getDailyDifficulty();
  const title      = getTitleForXp(dailyXp);
  const nextTitle  = TITLES.find((t) => t.minXp > dailyXp);

  // Réinitialise dailyTodayScore au passage minuit (nouveau jour)
  // (La comparaison dailyLastDate === todayStr suffit — pas besoin d'un reset actif)

  async function handlePlay() {
    if (alreadyPlayed || loading || !profile) return;
    setLoading(true);
    setFetchError(false);
    try {
      const pool = await fetchQuestions(category, locale, difficulty);
      const questions = getDailyQuestions(pool);
      startDailyQuiz(questions, category, difficulty);
      router.push('/quiz');
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  // Format date lisible : "Samedi 14 mars 2026"
  const dateLabel = new Date(todayStr).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="daily">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="daily__header">
        <Sun size={32} className="daily__sun-icon" aria-hidden="true" />
        <h1 className="daily__title">{t('title')}</h1>
        <p className="daily__date">{dateLabel}</p>
      </header>

      <main className="daily__body">

        {/* ── Streak + Shields ─────────────────────────────────────────────── */}
        <div className="daily__streak-row">
          <div className="daily__streak">
            <Flame size={24} className="daily__flame" aria-hidden="true" />
            <span className="daily__streak-count">{dailyStreak}</span>
            <span className="daily__streak-label">{t('streakLabel')}</span>
          </div>
          <div className="daily__shields">
            {Array.from({ length: 2 }).map((_, i) => (
              <Shield
                key={i}
                size={22}
                className={`daily__shield-icon${i < dailyShields ? ' daily__shield-icon--active' : ''}`}
                aria-label={i < dailyShields ? t('shieldAvailable') : t('shieldEmpty')}
              />
            ))}
          </div>
        </div>

        {/* ── Titre + XP ───────────────────────────────────────────────────── */}
        <div className="daily__xp-card">
          <span className="daily__title-emoji" aria-hidden="true">{title.emoji}</span>
          <div className="daily__xp-info">
            <span className="daily__player-title">{t(`title_${title.id}`)}</span>
            <span className="daily__xp-total">{dailyXp} XP</span>
          </div>
          {nextTitle && (
            <div className="daily__xp-progress-wrap">
              <div className="daily__xp-progress">
                <div
                  className="daily__xp-bar"
                  style={{
                    // Progression vers le prochain palier
                    '--bar-pct': `${Math.min(100, Math.round(
                      ((dailyXp - title.minXp) / (nextTitle.minXp - title.minXp)) * 100
                    ))}%`,
                  } as React.CSSProperties}
                />
              </div>
              <span className="daily__xp-next">
                {nextTitle.emoji} {nextTitle.minXp} XP
              </span>
            </div>
          )}
        </div>

        {/* ── Info du quiz du jour ─────────────────────────────────────────── */}
        <div className="daily__quiz-card">
          <h2 className="daily__quiz-title">{t('quizTitle')}</h2>
          <div className="daily__quiz-meta">
            <span className="daily__quiz-category">
              {CATEGORY_ICONS[category]}
              {tHome(category)}
            </span>
            <span className={`daily__quiz-diff daily__quiz-diff--${difficulty}`}>
              {tHome(difficulty)}
            </span>
          </div>
          <p className="daily__quiz-desc">{t('quizDesc')}</p>
        </div>

        {/* ── Score du jour si déjà joué ───────────────────────────────────── */}
        {alreadyPlayed && dailyTodayScore !== null && (
          <div className="daily__done-card" role="status">
            <span className="daily__done-icon" aria-hidden="true">✅</span>
            <div className="daily__done-info">
              <span className="daily__done-label">{t('alreadyPlayed')}</span>
              <span className="daily__done-score">{dailyTodayScore} / 20</span>
            </div>
          </div>
        )}

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <div className="daily__actions">
          <button
            type="button"
            className="daily__cta"
            onClick={handlePlay}
            disabled={alreadyPlayed || loading}
            aria-busy={loading}
          >
            {loading ? '…' : alreadyPlayed ? t('ctaDone') : t('ctaPlay')}
            {!alreadyPlayed && !loading && (
              <ChevronRight size={20} aria-hidden="true" />
            )}
          </button>

          {fetchError && (
            <p className="daily__error" role="alert">{t('fetchError')}</p>
          )}

          <button
            type="button"
            className="daily__back"
            onClick={() => router.push('/home')}
          >
            {t('ctaBack')}
          </button>
        </div>

      </main>
    </div>
  );
}
