'use client';

/**
 * src/components/features/results/DuelResultPanel.tsx
 *
 * Panneau de résultat du duel asynchrone, affiché côté Joueur B après la partie.
 * Montre les scores et avatars des deux joueurs + verdict (victoire/défaite/égalité).
 */

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { buildAvatarUrl } from '@/lib/avatars';
import type { AvatarStyle } from '@/lib/avatars';
import type { Challenge } from '@/types';

/** Formate un temps en ms → "Xm Xs" ou "Xs" */
function formatTime(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

interface Props {
  duelResult:  Challenge | null;
  duelLoading: boolean;
  myPseudo:    string;
}

export default function DuelResultPanel({ duelResult, duelLoading, myPseudo }: Props) {
  const tChal = useTranslations('challenges');

  function getDuelWinnerMessage(): string {
    if (!duelResult) return '';
    const iAmB = duelResult.challenged_by === myPseudo;
    if (duelResult.winner === 'draw') {
      const hasTiming = duelResult.time_a !== null && duelResult.time_b !== null;
      return hasTiming ? tChal('duelDrawByTime') : tChal('duelDraw');
    }
    const iWon = (iAmB && duelResult.winner === 'b') || (!iAmB && duelResult.winner === 'a');
    if (iWon) return tChal('duelYouWin');
    const opponentPseudo = iAmB ? duelResult.created_by : (duelResult.challenged_by ?? '');
    return tChal('duelWinner', { pseudo: opponentPseudo });
  }

  return (
    <div className="results__duel" aria-live="polite">
      {duelLoading ? (
        <p className="results__duel-loading">⏳</p>
      ) : duelResult ? (
        <>
          <h2 className="results__duel-title">{tChal('duelResultTitle')}</h2>

          <div className="results__duel-scores">
            {/* Joueur A */}
            <div className={`results__duel-player${duelResult.winner === 'a' ? ' results__duel-player--winner' : ''}`}>
              {duelResult.avatar_a && (
                // eslint-disable-next-line @next/next/no-img-element
                <Image
                  src={buildAvatarUrl(duelResult.avatar_a, 'adventurer' as AvatarStyle)}
                  alt={duelResult.created_by}
                  className="results__duel-avatar"
                  width={56}
                  height={56}
                  unoptimized
                />
              )}
              <span className="results__duel-pseudo">{duelResult.created_by}</span>
              <span className="results__duel-score">{duelResult.score_a}/{duelResult.total}</span>
              {duelResult.time_a !== null && (
                <span className="results__duel-time">
                  {tChal('duelTimeLabel')} : {formatTime(duelResult.time_a)}
                  {duelResult.winner === 'a' && duelResult.score_a === duelResult.score_b && (
                    <span className="results__duel-faster">{tChal('duelTimeFaster')}</span>
                  )}
                </span>
              )}
            </div>

            <span className="results__duel-vs" aria-hidden="true">⚔️</span>

            {/* Joueur B */}
            <div className={`results__duel-player${duelResult.winner === 'b' ? ' results__duel-player--winner' : ''}`}>
              {duelResult.avatar_b && (
                // eslint-disable-next-line @next/next/no-img-element
                <Image
                  src={buildAvatarUrl(duelResult.avatar_b, 'adventurer' as AvatarStyle)}
                  alt={duelResult.challenged_by ?? ''}
                  className="results__duel-avatar"
                  width={56}
                  height={56}
                  unoptimized
                />
              )}
              <span className="results__duel-pseudo">{duelResult.challenged_by}</span>
              <span className="results__duel-score">{duelResult.score_b}/{duelResult.total}</span>
              {duelResult.time_b !== null && (
                <span className="results__duel-time">
                  {tChal('duelTimeLabel')} : {formatTime(duelResult.time_b)}
                  {duelResult.winner === 'b' && duelResult.score_a === duelResult.score_b && (
                    <span className="results__duel-faster">{tChal('duelTimeFaster')}</span>
                  )}
                </span>
              )}
            </div>
          </div>

          <p className="results__duel-winner-msg">{getDuelWinnerMessage()}</p>
        </>
      ) : null}
    </div>
  );
}
