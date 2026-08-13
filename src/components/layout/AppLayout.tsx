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

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useQuizStore } from '@/stores/quizStore';
import { Star, Trophy, Gamepad2, Home } from 'lucide-react';
import { buildAvatarUrl } from '@/lib/avatars';
import { getCategoryColor, getCategoryColorDark } from '@/lib/categories';
import type { AvatarStyle } from '@/lib/avatars';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const t      = useTranslations('sidebar');
  const router   = useRouter();
  const pathname = usePathname();
  const profile              = useProfileStore((s) => s.profile);
  const sessions             = useProfileStore((s) => s.sessions);

  // Catégorie du quiz en cours — colore la sidebar avec la couleur de catégorie
  const quizCategory    = useQuizStore((s) => s.category);
  const sidebarColor    = getCategoryColor(quizCategory);
  const sidebarColorDark = getCategoryColorDark(quizCategory);

  // Pas de profil → on passe les enfants tel quel (garde assurée par les pages)
  if (!profile) return <>{children}</>;

  const totalScore  = sessions.reduce((acc, s) => acc + s.score, 0);
  const totalGames  = sessions.length;
  const avatarUrl   = buildAvatarUrl(profile.avatarId, (profile.avatarStyle as AvatarStyle) || 'adventurer');

  return (
    <div className="app-layout">

      {/* ── Sidebar (visible uniquement sur desktop ≥ 1024px) ──────────────── */}
      {/* background calculé directement en JS — plus fiable que CSS custom properties via inline style */}
      <aside
        className="app-layout__sidebar"
        aria-label={t('sidebarLabel')}
        style={{
          background: quizCategory
            ? `linear-gradient(180deg, ${sidebarColor} 0%, ${sidebarColorDark} 100%)`
            : 'linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
        }}
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
          <Image
            className="app-layout__avatar"
            src={avatarUrl}
            alt={profile.pseudo}
            width={88}
            height={88}
            unoptimized
          />
          <strong className="app-layout__pseudo">{profile.pseudo}</strong>
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


        {/* Navigation rapide */}
        <nav className="app-layout__nav" aria-label="Navigation">
          <button
            className={`app-layout__nav-btn${pathname === '/home' ? ' app-layout__nav-btn--active' : ''}`}
            onClick={() => router.push('/home')}
            aria-label="Retour à l'accueil"
            aria-current={pathname === '/home' ? 'page' : undefined}
          >
            <Home size={16} aria-hidden="true" />
            <span>Accueil</span>
          </button>
        </nav>

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
