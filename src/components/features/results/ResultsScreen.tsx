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
 * Flux défi (challengeId !== null — Joueur B vient de finir) :
 *   Au montage → completeChallenge() → récupère le résultat (Joueur A vs Joueur B)
 *   Affiche le panneau de comparaison duel sous le score
 *
 * Confetti : déclenché au montage si score ≥ BADGE_THRESHOLD ou victoire en duel.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useQuizStore } from '@/stores/quizStore';
import { useProfileStore } from '@/stores/profileStore';
import { playSound } from '@/lib/sound';
import { syncSession, syncBadge } from '@/lib/sync';
import { fetchQuestions } from '@/lib/questions';
import { createChallenge, completeChallenge } from '@/lib/challenges';
import { getTitleForXp } from '@/lib/daily';
import Nova from '@/components/ui/Nova';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import { buildAvatarUrl } from '@/lib/avatars';
import type { AvatarStyle } from '@/lib/avatars';
import type { DailyResult } from '@/stores/profileStore';
import type { Locale, Challenge } from '@/types';
import { Swords, Copy, Check, Sun, Flame, Shield } from 'lucide-react';

export default function ResultsScreen() {
  const t         = useTranslations('results');
  const tHome     = useTranslations('home');
  const tNova     = useTranslations('nova');
  const tBadges   = useTranslations('badges');
  const tChal     = useTranslations('challenges');
  const tDaily    = useTranslations('daily');
  const locale    = useLocale() as Locale;
  const router    = useRouter();

  const { status, score, category, difficulty, questions, challengeId, isDailyChallenge, startQuiz, resetAll } = useQuizStore();
  const soundEnabled           = useProfileStore((s) => s.soundEnabled);
  const deviceId               = useProfileStore((s) => s.deviceId);
  const ageGroup               = useProfileStore((s) => s.profile?.ageGroup ?? '6-9');
  const profile                = useProfileStore((s) => s.profile);
  const multiplayerUnlocked    = useProfileStore((s) => s.multiplayerUnlocked);
  const newBadgesThisSession   = useProfileStore((s) => s.newBadgesThisSession);
  const completeDailyChallenge = useProfileStore((s) => s.completeDailyChallenge);
  const dailyXp                = useProfileStore((s) => s.dailyXp);

  const total = questions.length || 20;
  const badgeEarnedThisSession = newBadgesThisSession.length > 0;
  const [loading, setLoading] = useState(false);
  // Ref pour éviter que le guard ne redirige vers /home pendant un replay.
  // handlePlayAgain appelle startQuiz() qui change status → 'active' AVANT
  // que router.push('/quiz') prenne effet — sans ce ref, le guard se déclenche
  // et router.replace('/home') écrase la navigation vers /quiz.
  const isReplayingRef = useRef(false);

  // ── État mode défi (Joueur B) ───────────────────────────────────────────────
  const [duelResult, setDuelResult]   = useState<Challenge | null>(null);
  const [duelLoading, setDuelLoading] = useState(false);

  // ── État mode défi quotidien ────────────────────────────────────────────────
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);

  // ── État création défi (Joueur A — bouton "Défier un ami") ─────────────────
  const [createLoading, setCreateLoading] = useState(false);
  const [createdCode, setCreatedCode]     = useState<string | null>(null);
  const [codeCopied, setCodeCopied]       = useState(false);

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
    if (deviceId && category && difficulty) {
      const { sessions } = useProfileStore.getState();
      // La dernière session insérée correspond à la partie qui vient de se terminer
      const lastSession = sessions[sessions.length - 1];
      if (lastSession) syncSession(deviceId, lastSession);
      if (badgeEarnedThisSession) syncBadge(deviceId, true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Complétion du défi (Joueur B vient de finir son quiz) ─────────────────
  // Déclenché uniquement si challengeId est présent (mode défi)

  const completeChallengeFlow = useCallback(async () => {
    if (!challengeId || !profile) return;
    setDuelLoading(true);
    const result = await completeChallenge(
      challengeId,
      profile.pseudo,
      profile.avatarId,
      score
    );
    if (result) {
      setDuelResult(result);
      // Confetti si victoire ou match nul
      if (result.winner === 'b' || result.winner === 'draw') {
        import('canvas-confetti').then((mod) => {
          mod.default({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#667eea', '#764ba2', '#FFD700'],
          });
        });
      }
    }
    setDuelLoading(false);
  }, [challengeId, profile, score]);

  useEffect(() => {
    if (status === 'finished' && challengeId) {
      completeChallengeFlow();
    }
  }, [status, challengeId, completeChallengeFlow]);

  // ── Complétion du défi quotidien ──────────────────────────────────────────
  // Déclenché uniquement si isDailyChallenge — met à jour le store et capture le résultat.
  useEffect(() => {
    if (status === 'finished' && isDailyChallenge) {
      const result = completeDailyChallenge(score, total);
      setDailyResult(result);
      // Confetti si streak ≥ 3 ou score parfait
      if (result.newStreak >= 3 || score === total) {
        import('canvas-confetti').then((mod) => {
          mod.default({
            particleCount: 60,
            spread: 50,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#d97706', '#667eea', '#FFD700'],
          });
        });
      }
    }
  }, [status, isDailyChallenge]); // eslint-disable-line react-hooks/exhaustive-deps

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
    isReplayingRef.current = true;
    setLoading(true);
    try {
      // Récupère les questions depuis Supabase (cache 24h + fallback offline)
      const pool = await fetchQuestions(category, locale as Locale, difficulty, ageGroup);
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

  // ── Créer un défi depuis cet écran de résultats (Joueur A) ───────────────

  async function handleCreateChallenge() {
    if (!profile || !category || !difficulty || createLoading || !questions.length) return;
    setCreateLoading(true);
    try {
      const code = await createChallenge({
        pseudo: profile.pseudo,
        avatarId: profile.avatarId,
        category,
        difficulty,
        locale,
        ageGroup: profile.ageGroup,
        // Snapshot des questions jouées — ordre identique pour Joueur B
        questions,
        scoreA: score,
      });
      setCreatedCode(code);
    } catch {
      // Silencieux — l'utilisateur peut réessayer
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleCopyCode() {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    } catch {
      // Fallback silencieux
    }
  }

  /** Retourne le message de victoire/défaite/égalité pour le duel. */
  function getDuelWinnerMessage(): string {
    if (!duelResult || !profile) return '';
    const iAmB = duelResult.challenged_by === profile.pseudo;
    if (duelResult.winner === 'draw') return tChal('duelDraw');
    // Victoire Joueur B : iAmB + winner === 'b', ou !iAmB + winner === 'a'
    const iWon = (iAmB && duelResult.winner === 'b') || (!iAmB && duelResult.winner === 'a');
    if (iWon) return tChal('duelYouWin');
    const opponentPseudo = iAmB ? duelResult.created_by : (duelResult.challenged_by ?? '');
    return tChal('duelWinner', { pseudo: opponentPseudo });
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
          {/* Badge "Défi" visible quand on joue en mode défi */}
          {challengeId && (
            <span className="results__challenge-badge">
              <Swords size={14} aria-hidden="true" /> Défi
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
          </div>
        )}

        {/* ── Résultat du défi quotidien ────────────────────────────────────── */}
        {isDailyChallenge && dailyResult && (
          <div className="results__daily" role="status">
            <div className="results__daily-header">
              <Sun size={22} aria-hidden="true" />
              <span className="results__daily-title">{tDaily('resultTitle')}</span>
            </div>
            <div className="results__daily-xp">
              <span className="results__daily-xp-amount">+{dailyResult.xpGained} XP</span>
            </div>
            <div className="results__daily-streak">
              <Flame size={18} aria-hidden="true" />
              <span>{tDaily('resultStreak', { count: dailyResult.newStreak })}</span>
            </div>
            {dailyResult.shieldUsed && (
              <p className="results__daily-shield-used">
                <Shield size={14} aria-hidden="true" />
                {tDaily('shieldUsed')}
              </p>
            )}
            {dailyResult.shieldEarned && (
              <p className="results__daily-shield-earned">
                <Shield size={14} aria-hidden="true" />
                {tDaily('shieldEarned')}
              </p>
            )}
            <p className="results__daily-player-title">
              {/* Titre recalculé depuis le XP mis à jour dans le store */}
              {(() => { const t = getTitleForXp(dailyXp); return `${t.emoji} ${tDaily(`title_${t.id}` as Parameters<typeof tDaily>[0])}`; })()}
            </p>
          </div>
        )}

        {/* ── Résultat du duel (affiché quand Joueur B finit un défi) ─────── */}
        {challengeId && (
          <div className="results__duel" aria-live="polite">
            {duelLoading ? (
              <p className="results__duel-loading">⏳</p>
            ) : duelResult ? (
              <>
                <h2 className="results__duel-title">{tChal('duelResultTitle')}</h2>

                {/* Scores côte à côte : Joueur A vs Joueur B */}
                <div className="results__duel-scores">
                  <div className={`results__duel-player${duelResult.winner === 'a' ? ' results__duel-player--winner' : ''}`}>
                    {duelResult.avatar_a && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={buildAvatarUrl(duelResult.avatar_a, 'adventurer' as AvatarStyle)}
                        alt={duelResult.created_by}
                        className="results__duel-avatar"
                        width={56}
                        height={56}
                      />
                    )}
                    <span className="results__duel-pseudo">{duelResult.created_by}</span>
                    <span className="results__duel-score">{duelResult.score_a}/{duelResult.total}</span>
                  </div>

                  <span className="results__duel-vs" aria-hidden="true">⚔️</span>

                  <div className={`results__duel-player${duelResult.winner === 'b' ? ' results__duel-player--winner' : ''}`}>
                    {duelResult.avatar_b && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={buildAvatarUrl(duelResult.avatar_b, 'adventurer' as AvatarStyle)}
                        alt={duelResult.challenged_by ?? ''}
                        className="results__duel-avatar"
                        width={56}
                        height={56}
                      />
                    )}
                    <span className="results__duel-pseudo">{duelResult.challenged_by}</span>
                    <span className="results__duel-score">{duelResult.score_b}/{duelResult.total}</span>
                  </div>
                </div>

                <p className="results__duel-winner-msg">{getDuelWinnerMessage()}</p>
              </>
            ) : null}
          </div>
        )}

        {/* ── Modal partage de code (après création d'un défi par Joueur A) ─ */}
        {createdCode && (
          <div className="results__challenge-modal" role="dialog" aria-modal="true" aria-label={tChal('createTitle')}>
            <p className="results__challenge-modal-title">{tChal('createTitle')}</p>
            <p className="results__challenge-modal-desc">{tChal('createDesc')}</p>
            <div className="results__challenge-code-wrap">
              <span className="results__challenge-code">{createdCode}</span>
              <button
                type="button"
                className="results__challenge-copy-btn"
                onClick={handleCopyCode}
                aria-label={tChal('createCopy')}
              >
                {codeCopied ? <Check size={18} /> : <Copy size={18} />}
                {codeCopied ? tChal('createCopied') : tChal('createCopy')}
              </button>
            </div>
            <p className="results__challenge-expiry">⏱ {tChal('createExpiry')}</p>
            <button
              type="button"
              className="results__cta-secondary"
              onClick={() => setCreatedCode(null)}
            >
              {tChal('createCtaDone')}
            </button>
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        {!createdCode && (
          <div className="results__actions">

            {/* Bouton "Défier un ami" — mode normal uniquement, multijoueur débloqué */}
            {!challengeId && !isDailyChallenge && multiplayerUnlocked && category && difficulty && (
              <button
                type="button"
                className="results__cta-challenge"
                onClick={handleCreateChallenge}
                disabled={createLoading}
              >
                <Swords size={18} aria-hidden="true" />
                {createLoading ? '…' : tChal('defierBtn')}
              </button>
            )}

            {/* Rejouer — uniquement en mode normal (pas après un défi ou quotidien) */}
            {!challengeId && !isDailyChallenge && category && difficulty && (
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
        )}

      </main>
    </div>
  );
}
