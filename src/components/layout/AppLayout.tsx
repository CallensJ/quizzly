'use client';

/**
 * src/components/layout/AppLayout.tsx
 *
 * Layout principal post-onboarding (Home, Quiz, Results, Profile).
 *
 * Stratégie responsive :
 * - Mobile (<1024px)  : sidebar masquée, contenu pleine largeur (comportement inchangé)
 * - Desktop (≥1024px) : sidebar fixe 280px à gauche + zone de contenu flex-1
 *
 * La sidebar contient : logo, carte profil cliquable, stats de jeu, badges.
 * Elle reprend le gradient primary de l'identité visuelle.
 */

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useQuizStore } from '@/stores/quizStore';
import { Star, Trophy, Gamepad2, Swords, Sun, Flame, Users } from 'lucide-react';
import { buildAvatarUrl } from '@/lib/avatars';
import { getDailyDateString, getTitleForXp } from '@/lib/daily';
import { getCategoryColor, getCategoryColorDark } from '@/lib/categories';
import type { AvatarStyle } from '@/lib/avatars';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const t = useTranslations('sidebar');
  const router = useRouter();
  const profile              = useProfileStore((s) => s.profile);
  const sessions             = useProfileStore((s) => s.sessions);
  const profiles             = useProfileStore((s) => s.profiles);
  const multiplayerUnlocked  = useProfileStore((s) => s.multiplayerUnlocked);
  const dailyStreak          = useProfileStore((s) => s.dailyStreak);
  const dailyXp              = useProfileStore((s) => s.dailyXp);
  const dailyLastDate        = useProfileStore((s) => s.dailyLastDate);
  const alreadyPlayedToday   = dailyLastDate === getDailyDateString();

  // Catégorie du quiz en cours — colore la sidebar avec la couleur de catégorie
  const quizCategory    = useQuizStore((s) => s.category);
  const sidebarColor    = getCategoryColor(quizCategory);
  const sidebarColorDark = getCategoryColorDark(quizCategory);

  // Pas de profil → on passe les enfants tel quel (garde assurée par les pages)
  if (!profile) return <>{children}</>;

  const totalScore  = sessions.reduce((acc, s) => acc + s.score, 0);
  const totalGames  = sessions.length;
  const avatarUrl   = buildAvatarUrl(profile.avatarId, (profile.avatarStyle as AvatarStyle) || 'adventurer');
  const playerTitle = getTitleForXp(dailyXp);

  return (
    <div className="app-layout">

      {/* ── Sidebar (visible uniquement sur desktop ≥ 1024px) ──────────────── */}
      {/* background calculé directement en JS — plus fiable que CSS custom properties via inline style */}
      <aside
        className="app-layout__sidebar"
        aria-label={t('sidebarLabel')}
        style={{ background: `linear-gradient(180deg, ${sidebarColor} 0%, ${sidebarColorDark} 100%)` }}
      >

        {/* Logo */}
        <div className="app-layout__logo">
          <span className="app-layout__logo-icon">🦉</span>
          <span className="app-layout__logo-text">Erudia</span>
        </div>

        {/* Carte profil — cliquable → page /profile */}
        <button
          className="app-layout__profile"
          onClick={() => router.push('/profile')}
          aria-label={t('goToProfile')}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG DiceBear externe, next/image ne supporte pas les URLs externes sans domaine configuré */}
          <img
            className="app-layout__avatar"
            src={avatarUrl}
            alt={profile.pseudo}
            width={88}
            height={88}
          />
          <strong className="app-layout__pseudo">{profile.pseudo}</strong>
          {dailyXp > 0 && (
            <span className="app-layout__player-title">
              {playerTitle.emoji} {playerTitle.id}
            </span>
          )}
        </button>

        {/* Statistiques de jeu */}
        <div className="app-layout__stats" aria-label={t('statsLabel')}>
          <div className="app-layout__stat">
            <Star size={18} aria-hidden="true" />
            <span>{t('points', { count: totalScore })}</span>
          </div>
          <div className="app-layout__stat">
            <Gamepad2 size={18} aria-hidden="true" />
            <span>{t('games', { count: totalGames })}</span>
          </div>
        </div>

        {/* Défi Quotidien — toujours visible (pas de verrou parental) */}
        <button
          className={`app-layout__daily-btn${alreadyPlayedToday ? ' app-layout__daily-btn--done' : ''}`}
          onClick={() => router.push('/daily')}
          aria-label="Défi du jour"
        >
          <Sun size={16} aria-hidden="true" />
          <span>Défi du jour</span>
          {dailyStreak > 0 && (
            <span className="app-layout__daily-streak">
              <Flame size={12} aria-hidden="true" />
              {dailyStreak}
            </span>
          )}
        </button>

        {/* Lien Mode Défi — visible uniquement si multiplayerUnlocked */}
        {multiplayerUnlocked && (
          <button
            className="app-layout__challenges-btn"
            onClick={() => router.push('/challenges')}
            aria-label="Mode Défi"
          >
            <Swords size={16} aria-hidden="true" />
            <span>Défis</span>
          </button>
        )}

        {/* Changer d'enfant — visible uniquement si plusieurs profils */}
        {profiles.length > 1 && (
          <button
            className="app-layout__switch-btn"
            onClick={() => router.push('/profiles')}
            aria-label="Changer d'enfant"
          >
            <Users size={16} aria-hidden="true" />
            <span>Changer d&apos;enfant</span>
          </button>
        )}

        {/* Section badges */}
        <div className="app-layout__badges-section">
          <h2 className="app-layout__badges-title">
            <Trophy size={16} aria-hidden="true" />
            {t('badgesTitle')}
          </h2>
          {profile.badgeEarned ? (
            <div className="app-layout__badge">
              🏆 {t('firstBadge')}
            </div>
          ) : (
            <p className="app-layout__no-badge">{t('noBadge')}</p>
          )}
        </div>

      </aside>

      {/* ── Zone de contenu principale ─────────────────────────────────────── */}
      <div className="app-layout__main">
        {children}
      </div>

    </div>
  );
}
