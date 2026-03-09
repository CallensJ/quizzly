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
import { Star, Trophy, Gamepad2 } from 'lucide-react';

// Fonds pastel DiceBear — même palette que l'onboarding pour cohérence
const BG_COLORS = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const t = useTranslations('sidebar');
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const sessions = useProfileStore((s) => s.sessions);

  // Pas de profil → on passe les enfants tel quel (garde assurée par les pages)
  if (!profile) return <>{children}</>;

  const totalScore = sessions.reduce((acc, s) => acc + s.score, 0);
  const totalGames = sessions.length;
  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${profile.avatarId}&backgroundColor=${BG_COLORS}`;
  const ageLabel = profile.ageGroup === '6-9' ? t('age6to9') : t('age10to13');

  return (
    <div className="app-layout">

      {/* ── Sidebar (visible uniquement sur desktop ≥ 1024px) ──────────────── */}
      <aside className="app-layout__sidebar" aria-label={t('sidebarLabel')}>

        {/* Logo */}
        <div className="app-layout__logo">
          <span className="app-layout__logo-icon">🦉</span>
          <span className="app-layout__logo-text">Quizzly</span>
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
          <span className="app-layout__age">{ageLabel}</span>
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
