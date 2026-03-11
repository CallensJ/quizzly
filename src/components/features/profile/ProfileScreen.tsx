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

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, Pencil, Lock } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import type { Locale } from '@/i18n/routing';
import type { Category, QuizSession } from '@/types';

// Seeds DiceBear — identiques à OnboardingScreen (même galerie prédéfinie)
const AVATAR_SEEDS = ['Milo', 'Zara', 'Felix', 'Luna', 'Sam', 'Ava', 'Kai', 'Lily'];
const BG_COLORS = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';

// URL de l'avatar DiceBear — même pattern que OnboardingScreen et AppLayout
function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${BG_COLORS}`;
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

// Catégories disponibles avec leur emoji
const CATEGORIES: { key: Category; emoji: string }[] = [
  { key: 'sciences', emoji: '🔬' },
  { key: 'histoire', emoji: '📜' },
  { key: 'heroes',   emoji: '⚔️' },
];

/**
 * Calcule les stats par catégorie depuis l'historique des sessions.
 * Retourne un objet { games, best } pour chaque catégorie.
 */
function statsByCategory(sessions: QuizSession[]): Record<Category, { games: number; best: number | null }> {
  const result: Record<Category, { games: number; best: number | null }> = {
    sciences: { games: 0, best: null },
    histoire:  { games: 0, best: null },
    heroes:    { games: 0, best: null },
  };
  for (const s of sessions) {
    result[s.category].games += 1;
    const pct = Math.round((s.score / s.totalQuestions) * 100);
    if (result[s.category].best === null || pct > result[s.category].best!) {
      result[s.category].best = pct;
    }
  }
  return result;
}

export default function ProfileScreen() {
  const t = useTranslations('profile');
  const tSidebar = useTranslations('sidebar');
  const tHome = useTranslations('home'); // noms des catégories
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;

  function toggleLocale() {
    const next: Locale = locale === 'fr' ? 'en' : 'fr';
    router.replace(pathname, { locale: next });
  }

  const profile = useProfileStore((s) => s.profile);
  const sessions = useProfileStore((s) => s.sessions);
  const updateAvatar = useProfileStore((s) => s.updateAvatar);
  const authUser = useAuthStore((s) => s.user);
  const timerEnabled = useProfileStore((s) => s.timerEnabled);
  const setTimerEnabled = useProfileStore((s) => s.setTimerEnabled);
  const soundEnabled = useProfileStore((s) => s.soundEnabled);
  const setSoundEnabled = useProfileStore((s) => s.setSoundEnabled);

  // Mode édition avatar — affiche la galerie inline sous la carte identité
  const [editingAvatar, setEditingAvatar] = useState(false);

  if (!profile) return null;

  const totalGames = sessions.length;
  const totalPoints = sessions.reduce((sum, s) => sum + s.score, 0);
  const best = bestScorePercent(sessions);
  const catStats = statsByCategory(sessions);

  function handleSelectAvatar(seed: string) {
    updateAvatar(seed);
    setEditingAvatar(false); // ferme la galerie après sélection
  }

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
          {/* Avatar + bouton crayon pour ouvrir la galerie */}
          <div className="profile__avatar-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(profile.avatarId)}
              alt={`Avatar de ${profile.pseudo}`}
              className="profile__avatar"
              width={100}
              height={100}
            />
            <button
              type="button"
              className="profile__avatar-edit-btn"
              onClick={() => setEditingAvatar((v) => !v)}
              aria-label={t('changeAvatar')}
              aria-expanded={editingAvatar}
            >
              <Pencil size={14} strokeWidth={2.5} />
            </button>
          </div>
          <div className="profile__identity-info">
            <p className="profile__pseudo">{profile.pseudo}</p>
            <p className="profile__age">
              {profile.ageGroup === '6-9' ? tSidebar('age6to9') : tSidebar('age10to13')}
            </p>
            <button
              type="button"
              className="profile__avatar-change-label"
              onClick={() => setEditingAvatar((v) => !v)}
            >
              {editingAvatar ? t('changeAvatarCancel') : t('changeAvatar')}
            </button>
          </div>
        </div>

        {/* ── Galerie de sélection d'avatar (inline, slide-down) ────────── */}
        {editingAvatar && (
          <div className="profile__avatar-gallery" role="group" aria-label={t('changeAvatar')}>
            {AVATAR_SEEDS.map((seed) => (
              <button
                key={seed}
                type="button"
                className={`profile__avatar-option${profile.avatarId === seed ? ' profile__avatar-option--active' : ''}`}
                onClick={() => handleSelectAvatar(seed)}
                aria-label={seed}
                aria-pressed={profile.avatarId === seed}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(seed)}
                  alt=""
                  width={60}
                  height={60}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

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

        {/* ── Scores par catégorie ──────────────────────────────────────── */}
        <section className="profile__cat-stats" aria-label={t('catStats')}>
          <h2 className="profile__section-title">{t('catStats')}</h2>

          {CATEGORIES.map(({ key, emoji }) => {
            const stat = catStats[key];
            return (
              <div key={key} className={`profile__cat-card profile__cat-card--${key}`}>
                <span className="profile__cat-icon" aria-hidden="true">{emoji}</span>
                <div className="profile__cat-info">
                  <p className="profile__cat-name">{tHome(key)}</p>
                  <p className="profile__cat-detail">
                    {stat.games > 0
                      ? t('catGames', { count: stat.games })
                      : t('catNone')}
                  </p>
                </div>
                {/* Meilleur score affiché uniquement si au moins une partie jouée */}
                {stat.best !== null && (
                  <span className="profile__cat-best">{stat.best}%</span>
                )}
              </div>
            );
          })}
        </section>

        {/* ── Paramètres ────────────────────────────────────────────────── */}
        <section className="profile__settings" aria-label={t('settingsTitle')}>
          <h2 className="profile__section-title">{t('settingsTitle')}</h2>

          {/* Ligne : timer optionnel — interrupteur accessible */}
          <div className="profile__setting-row">
            <div className="profile__setting-info">
              <p className="profile__setting-name">{t('timerLabel')}</p>
              <p className="profile__setting-desc">{t('timerDesc')}</p>
            </div>
            <label className="profile__toggle" aria-label={t('timerLabel')}>
              <input
                type="checkbox"
                className="profile__toggle-input"
                checked={timerEnabled}
                onChange={(e) => setTimerEnabled(e.target.checked)}
              />
              <span className="profile__toggle-track" aria-hidden="true">
                <span className="profile__toggle-thumb" />
              </span>
            </label>
          </div>

          {/* Ligne : sons — interrupteur accessible */}
          <div className="profile__setting-row">
            <div className="profile__setting-info">
              <p className="profile__setting-name">{t('soundLabel')}</p>
              <p className="profile__setting-desc">{t('soundDesc')}</p>
            </div>
            <label className="profile__toggle" aria-label={t('soundLabel')}>
              <input
                type="checkbox"
                className="profile__toggle-input"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
              />
              <span className="profile__toggle-track" aria-hidden="true">
                <span className="profile__toggle-thumb" />
              </span>
            </label>
          </div>

          {/* Ligne : langue — bouton toggle FR/EN (même pattern qu'onboarding) */}
          <div className="profile__setting-row">
            <div className="profile__setting-info">
              <p className="profile__setting-name">{t('langLabel')}</p>
              <p className="profile__setting-desc">{t('langDesc')}</p>
            </div>
            <button
              className="profile__lang-btn"
              onClick={toggleLocale}
              aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en français'}
            >
              {locale === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
            </button>
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

        {/* ── Espace parent — accès discret en bas de page ──────────────── */}
        {/* Redirige vers /auth/login si non connecté, /admin sinon */}
        <button
          type="button"
          className="profile__admin-link"
          onClick={() => router.push(authUser ? '/admin' : '/auth/login')}
        >
          <Lock size={13} strokeWidth={2} aria-hidden="true" />
          {t('adminLink')}
        </button>

      </main>
    </div>
  );
}
