'use client';

/**
 * src/components/features/multiplayer/ChallengesScreen.tsx
 *
 * Écran principal du mode Défi (multijoueur asynchrone — MVP 4).
 *
 * Logique d'accès :
 *   multiplayerUnlocked === false → écran de verrouillage (lien vers /admin)
 *   multiplayerUnlocked === true  → deux onglets : "Rejoindre" + "Mes défis"
 *
 * L'onglet "Rejoindre" permet à Joueur B d'entrer un code et de lancer le quiz.
 * L'onglet "Mes défis" affiche l'historique des défis créés et reçus avec polling 30s.
 */

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useQuizStore } from '@/stores/quizStore';
import { joinChallenge, fetchMyChallenges } from '@/lib/challenges';
import type { JoinError } from '@/lib/challenges';
import { buildAvatarUrl } from '@/lib/avatars';
import type { AvatarStyle } from '@/lib/avatars';
import type { Challenge } from '@/types';
import { Lock, Swords, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

type Tab = 'join' | 'my';

// Intervalle de polling (30s) — détecte si un défi en attente a été joué
const POLL_INTERVAL_MS = 30_000;

export default function ChallengesScreen() {
  const t      = useTranslations('challenges');
  const tHome  = useTranslations('home');
  const router = useRouter();

  const profile              = useProfileStore((s) => s.profile);
  const multiplayerUnlocked  = useProfileStore((s) => s.multiplayerUnlocked);
  const startChallengeQuiz   = useQuizStore((s) => s.startChallengeQuiz);
  const setCategory          = useQuizStore((s) => s.setCategory);
  const setDifficulty        = useQuizStore((s) => s.setDifficulty);

  const [tab, setTab]                 = useState<Tab>('join');
  const [code, setCode]               = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError]     = useState<string | null>(null);
  const [preview, setPreview]         = useState<Challenge | null>(null);

  const [challenges, setChallenges]         = useState<Challenge[]>([]);
  const [myLoading, setMyLoading]           = useState(false);
  // Clé incrémentée pour déclencher un rechargement (bouton refresh, polling)
  const [refreshKey, setRefreshKey]         = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Chargement de l'historique ──────────────────────────────────────────────
  // Pattern React recommandé : fonction async locale dans l'effet (pas de useCallback
  // externe avec setState, ce qui déclencherait react-hooks/set-state-in-effect).

  useEffect(() => {
    if (tab !== 'my' || !multiplayerUnlocked || !profile) return;
    let cancelled = false;

    async function load() {
      // Tous les setState sont après un await → pas de rendu synchrone en cascade
      await Promise.resolve();
      if (cancelled || !profile) return;
      setMyLoading(true);
      const data = await fetchMyChallenges(profile.pseudo);
      if (!cancelled) {
        setChallenges(data);
        setMyLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [tab, multiplayerUnlocked, profile, refreshKey]);

  // ── Polling 30s — rafraîchit l'historique si des défis sont en attente ─────

  useEffect(() => {
    const hasPending = challenges.some((c) => c.status === 'pending');
    if (tab === 'my' && multiplayerUnlocked && hasPending) {
      pollRef.current = setInterval(
        () => setRefreshKey((k) => k + 1),
        POLL_INTERVAL_MS,
      );
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tab, challenges, multiplayerUnlocked]);

  // ── Rejoindre — validation du code ─────────────────────────────────────────

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6 || !profile) return;

    setJoinLoading(true);
    setJoinError(null);
    setPreview(null);

    const result = await joinChallenge(trimmed, profile.pseudo);

    if ('error' in result) {
      const errorMap: Record<JoinError, string> = {
        not_found:   'joinErrorNotFound',
        expired:     'joinErrorExpired',
        completed:   'joinErrorCompleted',
        same_player: 'joinErrorSamePlayer',
      };
      const msgKey = errorMap[result.error as JoinError] as Parameters<typeof t>[0];
      setJoinError(t(msgKey));
    } else {
      setPreview(result.challenge);
    }

    setJoinLoading(false);
  }

  // ── Lancer le quiz en mode défi ────────────────────────────────────────────

  function handleStartChallenge() {
    if (!preview) return;
    // Synchronise category + difficulty dans quizStore pour les stats et l'affichage
    setCategory(preview.category);
    setDifficulty(preview.difficulty);
    // Lance le quiz avec les questions snapshotées (même ordre que Joueur A)
    startChallengeQuiz(preview.questions, preview.code);
    router.push('/quiz');
  }

  // ── Helpers d'affichage ────────────────────────────────────────────────────

  function getCategoryLabel(cat: string): string {
    const key = cat as Parameters<typeof tHome>[0];
    try { return tHome(key); } catch { return cat; }
  }

  function getDifficultyLabel(diff: string): string {
    const key = diff as Parameters<typeof tHome>[0];
    try { return tHome(key); } catch { return diff; }
  }

  function getStatusIcon(challenge: Challenge) {
    if (challenge.status === 'expired')   return <XCircle size={16} className="challenges__status-icon challenges__status-icon--expired" />;
    if (challenge.status === 'completed') return <CheckCircle size={16} className="challenges__status-icon challenges__status-icon--completed" />;
    return <Clock size={16} className="challenges__status-icon challenges__status-icon--pending" />;
  }

  function getResultLabel(challenge: Challenge): string {
    if (!profile) return '';
    if (challenge.status === 'expired')   return t('resultExpired');
    if (challenge.status !== 'completed') return t('statusPending');

    const iAmA = challenge.created_by === profile.pseudo;
    if (challenge.winner === 'draw') return t('resultDraw');
    const iWon = (iAmA && challenge.winner === 'a') || (!iAmA && challenge.winner === 'b');
    return iWon ? t('resultWin') : t('resultLoss');
  }

  // ── Écran verrouillé ───────────────────────────────────────────────────────

  if (!multiplayerUnlocked) {
    return (
      <div className="challenges">
        <header className="challenges__header">
          <Swords size={22} aria-hidden="true" />
          <h1 className="challenges__title">{t('title')}</h1>
        </header>
        <div className="challenges__locked">
          <Lock size={48} className="challenges__lock-icon" aria-hidden="true" />
          <h2 className="challenges__locked-title">{t('lockedTitle')}</h2>
          <p className="challenges__locked-desc">{t('lockedDesc')}</p>
          <button
            type="button"
            className="challenges__locked-cta"
            onClick={() => router.push('/admin')}
          >
            {t('lockedCta')}
          </button>
        </div>
      </div>
    );
  }

  // ── Écran principal ────────────────────────────────────────────────────────

  return (
    <div className="challenges">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="challenges__header">
        <Swords size={22} aria-hidden="true" />
        <h1 className="challenges__title">{t('title')}</h1>
      </header>

      {/* ── Onglets ─────────────────────────────────────────────────────────── */}
      <div className="challenges__tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'join'}
          className={`challenges__tab${tab === 'join' ? ' challenges__tab--active' : ''}`}
          onClick={() => { setTab('join'); setPreview(null); setJoinError(null); setCode(''); }}
        >
          {t('tabJoin')}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'my'}
          className={`challenges__tab${tab === 'my' ? ' challenges__tab--active' : ''}`}
          onClick={() => setTab('my')}
        >
          {t('tabMyChallenges')}
        </button>
      </div>

      {/* ── Onglet Rejoindre ────────────────────────────────────────────────── */}
      {tab === 'join' && (
        <div className="challenges__panel" role="tabpanel">
          <h2 className="challenges__panel-title">{t('joinTitle')}</h2>

          {!preview ? (
            <div className="challenges__join-form">
              <label className="challenges__join-label" htmlFor="challenge-code">
                {t('joinLabel')}
              </label>
              <input
                id="challenge-code"
                type="text"
                className={`challenges__join-input${joinError ? ' challenges__join-input--error' : ''}`}
                value={code}
                onChange={(e) => {
                  // Forcer uppercase et max 6 chars
                  setCode(e.target.value.toUpperCase().slice(0, 6));
                  setJoinError(null);
                }}
                placeholder={t('joinPlaceholder')}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                aria-describedby={joinError ? 'join-error' : undefined}
              />
              {joinError && (
                <p id="join-error" className="challenges__join-error" role="alert">
                  {joinError}
                </p>
              )}
              <button
                type="button"
                className="challenges__join-cta"
                onClick={handleJoin}
                disabled={code.length !== 6 || joinLoading}
              >
                {joinLoading ? t('joinLoading') : t('joinCta')}
              </button>
            </div>
          ) : (
            /* ── Aperçu du défi trouvé ─────────────────────────────────────── */
            <div className="challenges__preview">
              <p className="challenges__preview-title">{t('joinPreviewTitle')}</p>

              {/* Avatar + infos Joueur A */}
              <div className="challenges__preview-challenger">
                {preview.avatar_a && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <Image
                    src={buildAvatarUrl(preview.avatar_a, 'adventurer' as AvatarStyle)}
                    alt={preview.created_by}
                    className="challenges__preview-avatar"
                    width={64}
                    height={64}
                    unoptimized
                  />
                )}
                <div>
                  <p className="challenges__preview-from">
                    {t('joinPreviewFrom', { pseudo: preview.created_by })}
                  </p>
                  <p className="challenges__preview-meta">
                    {getCategoryLabel(preview.category)} · {getDifficultyLabel(preview.difficulty)}
                  </p>
                  <p className="challenges__preview-score">
                    {t('joinPreviewScore', {
                      pseudo: preview.created_by,
                      score: preview.score_a,
                      total: preview.total,
                    })}
                  </p>
                </div>
              </div>

              <div className="challenges__preview-actions">
                <button
                  type="button"
                  className="challenges__preview-cta"
                  onClick={handleStartChallenge}
                >
                  {t('joinPreviewCta')}
                </button>
                <button
                  type="button"
                  className="challenges__preview-cancel"
                  onClick={() => { setPreview(null); setCode(''); }}
                >
                  {t('joinPreviewCancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Mes défis ────────────────────────────────────────────────── */}
      {tab === 'my' && (
        <div className="challenges__panel" role="tabpanel">
          <div className="challenges__my-header">
            <h2 className="challenges__panel-title">{t('myTitle')}</h2>
            <button
              type="button"
              className="challenges__refresh-btn"
              onClick={() => setRefreshKey((k) => k + 1)}
              aria-label="Rafraîchir"
              disabled={myLoading}
            >
              <RefreshCw size={16} className={myLoading ? 'challenges__refresh-icon--spinning' : ''} />
            </button>
          </div>

          {myLoading && challenges.length === 0 ? (
            <p className="challenges__loading">{t('myLoading')}</p>
          ) : challenges.length === 0 ? (
            <p className="challenges__empty">{t('myEmpty')}</p>
          ) : (
            <ul className="challenges__list">
              {challenges.map((ch) => {
                if (!profile) return null;
                const iAmA      = ch.created_by === profile.pseudo;
                const opponent  = iAmA ? ch.challenged_by : ch.created_by;
                const opponentAvatar = iAmA ? ch.avatar_b : ch.avatar_a;
                const myScore   = iAmA ? ch.score_a : ch.score_b;
                const theirScore = iAmA ? ch.score_b : ch.score_a;

                return (
                  <li key={ch.id} className={`challenges__item challenges__item--${ch.status}`}>
                    <div className="challenges__item-left">
                      {opponentAvatar ? (
                        <Image
                          src={buildAvatarUrl(opponentAvatar, 'adventurer' as AvatarStyle)}
                          alt={opponent ?? '?'}
                          className="challenges__item-avatar"
                          width={40}
                          height={40}
                          unoptimized
                        />
                      ) : (
                        <div className="challenges__item-avatar-placeholder" aria-hidden="true">?</div>
                      )}
                      <div className="challenges__item-info">
                        <span className="challenges__item-vs">
                          {t('challengeItemVs', { pseudo: opponent ?? '?' })}
                        </span>
                        <span className="challenges__item-meta">
                          {getCategoryLabel(ch.category)} · {getDifficultyLabel(ch.difficulty)}
                        </span>
                      </div>
                    </div>

                    <div className="challenges__item-right">
                      {ch.status === 'completed' && myScore !== null && theirScore !== null && (
                        <span className="challenges__item-scores">
                          {myScore} – {theirScore}
                        </span>
                      )}
                      <span className={`challenges__item-result challenges__item-result--${ch.status === 'completed' ? (ch.winner === 'draw' ? 'draw' : (iAmA ? ch.winner : (ch.winner === 'a' ? 'b' : 'a')) === 'b' ? 'win' : 'loss') : ch.status}`}>
                        {getResultLabel(ch)}
                      </span>
                      {getStatusIcon(ch)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

    </div>
  );
}
