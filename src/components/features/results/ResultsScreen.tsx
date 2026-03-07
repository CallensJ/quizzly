'use client';

/**
 * src/components/features/results/ResultsScreen.tsx
 *
 * Écran de fin de partie. Affiche le score final, le badge si obtenu,
 * un message contextuel adapté au score, et deux actions : rejouer ou retour Home.
 *
 * Flux :
 *   status !== 'finished' → redirige vers /home (refresh ou accès direct)
 *   Rejouer → recharge le même pool de questions → startQuiz() → /quiz
 *   Retour  → resetAll() → /home
 *
 * Confetti : déclenché au montage si score ≥ BADGE_THRESHOLD.
 */

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useQuizStore } from '@/stores/quizStore';
import { useProfileStore } from '@/stores/profileStore';
import { playSound } from '@/lib/sound';
import Nova from '@/components/ui/Nova';
import type { Category, Difficulty, Locale, QuestionFile } from '@/types';

// Doit rester synchronisé avec QuizScreen.tsx
const BADGE_THRESHOLD = 4;

// Même lookup que HomeScreen — évite les template literals dans import()
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

export default function ResultsScreen() {
  const t = useTranslations('results');
  const tHome = useTranslations('home');
  const tNova = useTranslations('nova');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const { status, score, category, difficulty, questions, startQuiz, resetAll } = useQuizStore();
  const profile = useProfileStore((s) => s.profile);
  const soundEnabled = useProfileStore((s) => s.soundEnabled);

  const total = questions.length || 20;
  const badgeEarnedThisSession = score >= BADGE_THRESHOLD;
  const [loading, setLoading] = useState(false);

  // ── Garde : quiz non terminé → retour Home ───────────────────────────────
  useEffect(() => {
    if (status !== 'finished') {
      router.replace('/home');
    }
  }, [status, router]);

  // ── Confetti + sons au montage ───────────────────────────────────────────
  useEffect(() => {
    // Son badge (fanfare) si badge obtenu, sinon son de fin de quiz
    if (badgeEarnedThisSession) {
      playSound('badge', soundEnabled);
      import('canvas-confetti').then((mod) => {
        mod.default({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#667eea', '#764ba2', '#FFD700', '#4CAF50', '#FF9800'],
        });
      });
    } else {
      playSound('finish', soundEnabled);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Renvoie le message contextuel selon le score obtenu.
   * 3 paliers : faible / moyen / excellent.
   */
  function getScoreMessage(): string {
    if (score < 4)  return t('msgLow');
    if (score < 14) return t('msgMid');
    return t('msgHigh');
  }

  /**
   * Retourne le message de Nova selon le score et si badge obtenu.
   * Nova reste affichée en permanence sur l'écran résultats (duration=0).
   */
  function getNovaMessage(): string {
    if (badgeEarnedThisSession) return tNova('badge');
    if (score < 4)  return tNova('finishLow');
    if (score < 14) return tNova('finishMid');
    return tNova('finishHigh');
  }

  /** Rejouer : recharge le même pool filtré et relance le quiz. */
  async function handlePlayAgain() {
    if (!category || !difficulty || loading) return;
    setLoading(true);
    try {
      const mod = await QUESTION_LOADERS[locale][category]();
      const pool = mod.default.questions.filter((q) => q.difficulty === difficulty);
      startQuiz(pool);
      router.push('/quiz');
    } finally {
      setLoading(false);
    }
  }

  function handleHome() {
    resetAll();
    router.push('/home');
  }

  if (status !== 'finished') return null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="results">

      {/* ── Header : score + métadonnées ───────────────────────────────────── */}
      <header className="results__header">

        <div className="results__meta">
          {category && (
            <span className="results__cat-label">
              {category === 'sciences' ? '🔬' : '📜'} {tHome(category)}
            </span>
          )}
          {difficulty && (
            <span className={`results__diff-chip results__diff-chip--${difficulty}`}>
              {tHome(difficulty)}
            </span>
          )}
        </div>

        {/* Score central — affiché en grand */}
        <div className="results__score-wrap" aria-live="polite">
          <p className="results__score-label">{t('title')}</p>
          <div className="results__score-display">
            <span className="results__score-num">{score}</span>
            <span className="results__score-sep">/</span>
            <span className="results__score-total">{total}</span>
          </div>
        </div>

      </header>

      {/* ── Corps : message + Nova + badge + boutons ───────────────────────── */}
      <main className="results__body">

        {/* Nova félicite ou encourage selon le score — fixe bas-droite, permanente */}
        <Nova
          state={badgeEarnedThisSession ? 'badge' : 'finish'}
          message={getNovaMessage()}
          visible={true}
          duration={0}
        />

        {/* Message contextuel adapté au score */}
        <p className="results__message">{getScoreMessage()}</p>

        {/* Badge — affiché uniquement si obtenu lors de cette session */}
        {badgeEarnedThisSession && (
          <div className="results__badge" role="status">
            <span className="results__badge-icon" aria-hidden="true">🏆</span>
            <p className="results__badge-title">{t('badgeTitle')}</p>
            <p className="results__badge-desc">{t('badgeEarned')}</p>
          </div>
        )}

        {/* Actions */}
        <div className="results__actions">
          {category && difficulty && (
            <button
              type="button"
              className="results__cta-primary"
              onClick={handlePlayAgain}
              disabled={loading}
            >
              {loading ? '…' : t('ctaPlayAgain')}
            </button>
          )}
          <button
            type="button"
            className="results__cta-secondary"
            onClick={handleHome}
          >
            {t('ctaHome')}
          </button>
        </div>

      </main>
    </div>
  );
}
