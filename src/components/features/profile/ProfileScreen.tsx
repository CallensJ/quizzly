'use client';

/**
 * src/components/features/profile/ProfileScreen.tsx
 *
 * Écran profil / dashboard personnel.
 * Affiche : avatar DiceBear, pseudonyme, tranche d'âge, statistiques de jeu,
 * et le badge gagné (ou un placeholder verrouillé si non obtenu).
 *
 * Les stats (total parties + meilleur score) sont calculées depuis l'historique
 * des sessions persisté dans profileStore.
 *
 * Navigation : bouton retour → /home.
 */

import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import type { QuizSession } from '@/types';

// URL de l'avatar DiceBear — même pattern que OnboardingScreen et AppLayout
function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Calcule le meilleur score (en %) parmi toutes les sessions.
 * Retourne null si aucune session.
 */
function bestScorePercent(sessions: QuizSession[]): number | null {
  if (!sessions.length) return null;
  const best = Math.max(...sessions.map((s) => s.score / s.totalQuestions));
  return Math.round(best * 100);
}

export default function ProfileScreen() {
  const t = useTranslations('profile');
  const tSidebar = useTranslations('sidebar');
  const router = useRouter();

  const profile = useProfileStore((s) => s.profile);
  const sessions = useProfileStore((s) => s.sessions);

  if (!profile) return null;

  const totalGames = sessions.length;
  const totalPoints = sessions.reduce((sum, s) => sum + s.score, 0);
  const best = bestScorePercent(sessions);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="profile">

      {/* ── Header : bouton retour + titre ───────────────────────────────── */}
      <header className="profile__header">
        <button
          type="button"
          className="profile__back-btn"
          onClick={() => router.push('/home')}
          aria-label={t('ctaBack')}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="profile__title">{t('title')}</h1>
        {/* Spacer pour centrer le titre */}
        <div className="profile__header-spacer" aria-hidden="true" />
      </header>

      <main className="profile__body">

        {/* ── Carte identité ────────────────────────────────────────────── */}
        <div className="profile__identity">
          <div className="profile__avatar-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(profile.avatarId)}
              alt={`Avatar de ${profile.pseudo}`}
              className="profile__avatar"
              width={100}
              height={100}
            />
          </div>
          <div className="profile__identity-info">
            <p className="profile__pseudo">{profile.pseudo}</p>
            <p className="profile__age">
              {profile.ageGroup === '6-9' ? tSidebar('age6to9') : tSidebar('age10to13')}
            </p>
          </div>
        </div>

        {/* ── Statistiques ──────────────────────────────────────────────── */}
        <section className="profile__stats" aria-label={tSidebar('statsLabel')}>
          <div className="profile__stat-card">
            <span className="profile__stat-value">{totalPoints}</span>
            <span className="profile__stat-label">{t('statPoints')}</span>
          </div>
          <div className="profile__stat-card">
            <span className="profile__stat-value">{totalGames}</span>
            <span className="profile__stat-label">{t('statGames')}</span>
          </div>
          <div className="profile__stat-card">
            <span className="profile__stat-value">
              {best !== null ? `${best}%` : '—'}
            </span>
            <span className="profile__stat-label">{t('statBest')}</span>
          </div>
        </section>

        {/* ── Badge ─────────────────────────────────────────────────────── */}
        <section className="profile__badge-section" aria-label={tSidebar('badgesTitle')}>
          <h2 className="profile__section-title">{tSidebar('badgesTitle')}</h2>

          {profile.badgeEarned ? (
            // Badge obtenu
            <div className="profile__badge profile__badge--earned">
              <span className="profile__badge-icon" aria-hidden="true">🏆</span>
              <p className="profile__badge-name">{tSidebar('firstBadge')}</p>
            </div>
          ) : (
            // Placeholder — badge verrouillé
            <div className="profile__badge profile__badge--locked" aria-label={t('noBadge')}>
              <span className="profile__badge-icon" aria-hidden="true">🔒</span>
              <p className="profile__badge-name">{t('noBadge')}</p>
            </div>
          )}
        </section>

        {/* ── Bouton retour ─────────────────────────────────────────────── */}
        <button
          type="button"
          className="profile__cta-home"
          onClick={() => router.push('/home')}
        >
          {t('ctaBack')}
        </button>

      </main>
    </div>
  );
}
