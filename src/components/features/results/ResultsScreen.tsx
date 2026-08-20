'use client';

/**
 * src/components/features/results/ResultsScreen.tsx
 *
 * Écran de fin de partie. Affiche le score final, le badge si obtenu,
 * un message contextuel adapté au score, et deux actions : rejouer ou retour Home.
 *
 * Flux normal :
 *   status !== 'finished' → redirige vers /home (refresh ou accès direct)
 *   Rejouer → recharge le même pool de questions → startQuiz() → /quiz
 *   Retour  → resetAll() → /home
 *
 * Confetti : déclenché au montage si score ≥ BADGE_THRESHOLD.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useQuizStore } from '@/stores/quizStore';
import { useProfileStore } from '@/stores/profileStore';
import { playSound } from '@/lib/sound';
import { syncSession, syncBadge } from '@/lib/sync';
import { fetchQuestions } from '@/lib/questions';
import { CATEGORY_EMOJI } from '@/lib/categories';
import { justUnlockedDifficulty, shouldSuggestDemotion, lowerDifficulty } from '@/lib/difficulty';
import Nova from '@/components/ui/Nova';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import type { StreakResult } from '@/stores/profileStore';
import type { Locale } from '@/types';
import { Flame, PartyPopper, HeartHandshake } from 'lucide-react';

export default function ResultsScreen() {
  const t         = useTranslations('results');
  const tHome   = useTranslations('home');
  const tNova   = useTranslations('nova');
  const tBadges = useTranslations('badges');
  const locale    = useLocale() as Locale;
  const router    = useRouter();

  const { status, score, category, difficulty, questions, startQuiz, setDifficulty, resetAll } = useQuizStore();
  const soundEnabled           = useProfileStore((s) => s.soundEnabled);
  const activeProfileId        = useProfileStore((s) => s.activeProfileId);
  const newBadgesThisSession   = useProfileStore((s) => s.newBadgesThisSession);
  const recordPlayStreak       = useProfileStore((s) => s.recordPlayStreak);
  const sessions                = useProfileStore((s) => s.sessions);

  const total = questions.length || 10;
  const badgeEarnedThisSession = newBadgesThisSession.length > 0;
  const [loading, setLoading] = useState(false);
  // Ref pour éviter que le guard ne redirige vers /home pendant un replay.
  // handlePlayAgain appelle startQuiz() qui change status → 'active' AVANT
  // que router.push('/quiz') prenne effet — sans ce ref, le guard se déclenche
  // et router.replace('/home') écrase la navigation vers /quiz.
  const isReplayingRef = useRef(false);

  // Snapshot du niveau réellement joué cette partie — figé au premier rendu.
  // handleAcceptDemotion modifie quizStore.difficulty pour la prochaine partie
  // (via "Rejouer"), ce qui ne doit pas changer rétroactivement ce qui est affiché
  // comme le niveau de LA partie qui vient de se terminer.
  const [playedDifficulty] = useState(difficulty);

  // ── Progression de difficulté ────────────────────────────────────────────
  const justUnlockedMedium = !!category && playedDifficulty === 'easy'
    && justUnlockedDifficulty(sessions, category, 'medium');
  const justUnlockedHard = !!category && playedDifficulty === 'medium'
    && justUnlockedDifficulty(sessions, category, 'hard');
  const demotionSuggested = !!category && playedDifficulty !== null
    && shouldSuggestDemotion(sessions, category, playedDifficulty);
  const [demotionDismissed, setDemotionDismissed] = useState(false);

  function handleAcceptDemotion() {
    if (!playedDifficulty) return;
    setDifficulty(lowerDifficulty(playedDifficulty));
    setDemotionDismissed(true);
  }

  // ── Série quotidienne (mise à jour à la fin de toute partie) ────────────────
  const [streakResult, setStreakResult] = useState<StreakResult | null>(null);

  // ── Garde : quiz non terminé → retour Home ───────────────────────────────
  useEffect(() => {
    if (status !== 'finished' && !isReplayingRef.current) {
      router.replace('/home');
    }
  }, [status, router]);

  // ── Confetti + sons + sync Supabase au montage ───────────────────────────
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

    // Sync Supabase — fire-and-forget, les données Zustand sont déjà persistées
    // QuizScreen appelle addSession() + earnBadge() avant de naviguer ici
    if (activeProfileId && category && difficulty) {
      const { sessions, earnedBadgeIds } = useProfileStore.getState();
      const lastSession = sessions[sessions.length - 1];
      if (lastSession) syncSession(activeProfileId, lastSession);
      if (badgeEarnedThisSession) syncBadge(activeProfileId, true, earnedBadgeIds);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Série quotidienne ─────────────────────────────────────────────────────
  // Déclenché à la fin de TOUTE partie (v1.4 : le défi quotidien a disparu, la série
  // récompense simplement le fait d'avoir joué aujourd'hui). Idempotent dans la journée.
  useEffect(() => {
    if (status !== 'finished') return;
    const result = recordPlayStreak();
    if (!result.isFirstPlayToday) return;
    setStreakResult(result);
    if (result.newStreak >= 3) {
      import('canvas-confetti').then((mod) => {
        mod.default({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#d97706', '#667eea', '#FFD700'],
        });
      });
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Confetti déblocage de niveau ─────────────────────────────────────────
  useEffect(() => {
    if (!justUnlockedMedium && !justUnlockedHard) return;
    import('canvas-confetti').then((mod) => {
      mod.default({
        particleCount: 100,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#4CAF50', '#FF9800', '#F44336', '#FFD700'],
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Renvoie le message contextuel selon le score obtenu (en %).
   * Seuils relatifs pour fonctionner quelle que soit la longueur du quiz.
   */
  function getScoreMessage(): string {
    const pct = score / total;
    if (pct < 0.4) return t('msgLow');
    if (pct < 0.7) return t('msgMid');
    return t('msgHigh');
  }

  /**
   * Retourne le message de Nova selon le score et si badge obtenu.
   * Nova reste affichée en permanence sur l'écran résultats (duration=0).
   */
  function getNovaMessage(): string {
    const pct = score / total;
    if (badgeEarnedThisSession) return tNova('badge');
    if (pct < 0.4) return tNova('finishLow');
    if (pct < 0.7) return tNova('finishMid');
    return tNova('finishHigh');
  }

  /** Rejouer : recharge le même pool filtré et relance le quiz. */
  async function handlePlayAgain() {
    if (!category || !difficulty || loading) return;
    isReplayingRef.current = true;
    setLoading(true);
    try {
      // Récupère les questions depuis Supabase (cache 24h + fallback offline)
      const pool = await fetchQuestions(category, locale as Locale, difficulty);
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
              {CATEGORY_EMOJI[category] ?? '🎮'} {tHome(category)}
            </span>
          )}
          {playedDifficulty && (
            <span className={`results__diff-chip results__diff-chip--${playedDifficulty}`}>
              {tHome(playedDifficulty)}
            </span>
          )}
        </div>

        {/* Score central — affiché en grand */}
        <div className="results__score-wrap" aria-live="polite">
          <p className="results__score-label">{t('title')}</p>
          <div className="results__score-display">
            <span className="results__score-num" data-testid="score-num">{score}</span>
            <span className="results__score-sep">/</span>
            <span className="results__score-total">{total}</span>
          </div>
        </div>

      </header>

      {/* ── Corps : message + Nova + badge + duel + boutons ────────────────── */}
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

        {/* Nouveaux badges débloqués cette session */}
        {newBadgesThisSession.length > 0 && (
          <div className="results__badges" role="status" aria-label={tBadges('newBadgeTitle')}>
            <p className="results__badges-title">{tBadges('newBadgeTitle')}</p>
            <div className="results__badges-list">
              {newBadgesThisSession.map((id) => {
                const def = BADGE_DEFINITIONS.find((b) => b.id === id);
                if (!def) return null;
                // Cast nécessaire car les clés i18n sont dynamiques
                const name = tBadges(`${id}_name` as Parameters<typeof tBadges>[0]);
                return (
                  <div key={id} className="results__badge-card">
                    <span className="results__badge-emoji" aria-hidden="true">{def.emoji}</span>
                    <span className="results__badge-name">{name}</span>
                  </div>
                );
              })}
            </div>
            <div className="results__badges-nav">
              <button
                type="button"
                className="results__badges-link"
                onClick={() => router.push('/profile')}
              >
                {tBadges('seeBadges')}
              </button>
              <button
                type="button"
                className="results__badges-link results__badges-link--secondary"
                onClick={() => { resetAll(); router.push('/home'); }}
              >
                {t('ctaHome')}
              </button>
            </div>
          </div>
        )}

        {/* ── Série quotidienne ────────────────────────────────────────────── */}
        {streakResult && streakResult.newStreak > 1 && (
          <div className="results__streak" role="status">
            <Flame size={18} aria-hidden="true" />
            <span>{t('streak', { count: streakResult.newStreak })}</span>
          </div>
        )}

        {/* ── Déblocage d'un niveau de difficulté ─────────────────────────── */}
        {(justUnlockedMedium || justUnlockedHard) && (
          <div className="results__promotion" role="status">
            <PartyPopper size={20} aria-hidden="true" />
            <span>
              {t('promotionUnlocked', { level: tHome(justUnlockedHard ? 'hard' : 'medium') })}
            </span>
          </div>
        )}

        {/* ── Suggestion de rétrogradation bienveillante ──────────────────── */}
        {demotionSuggested && !demotionDismissed && (
          <div className="results__demotion" role="status">
            <div className="results__demotion-text">
              <HeartHandshake size={20} aria-hidden="true" />
              <span>{t('demotionSuggestion')}</span>
            </div>
            <div className="results__demotion-actions">
              <button
                type="button"
                className="results__demotion-accept"
                onClick={handleAcceptDemotion}
              >
                {t('demotionAccept')}
              </button>
              <button
                type="button"
                className="results__demotion-decline"
                onClick={() => setDemotionDismissed(true)}
              >
                {t('demotionDecline')}
              </button>
            </div>
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="results__actions">

          {/* Rejouer */}
          {category && difficulty && (
            <button
              type="button"
              data-testid="play-again-btn"
              className="results__cta-primary"
              onClick={handlePlayAgain}
              disabled={loading}
            >
              {loading ? '…' : t('ctaPlayAgain')}
            </button>
          )}

          {/* Retour Home */}
          <button
            type="button"
            data-testid="home-btn"
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
