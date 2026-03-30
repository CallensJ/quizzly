'use client';

/**
 * src/components/features/profile/BadgesPreview.tsx
 *
 * Aperçu compact de la section badges sur le ProfileScreen.
 * Affiche : titre + progression globale (barre + X/total) + 5 derniers badges
 * obtenus + bouton CTA pour ouvrir la modale complète.
 *
 * Conçu pour ne pas dépasser 2 lignes visuelles sur mobile.
 */

import { useTranslations } from 'next-intl';
import { BADGE_DEFINITIONS } from '@/lib/badges';

interface BadgesPreviewProps {
  earnedBadgeIds: string[];
  onOpenModal: () => void;
}

export default function BadgesPreview({ earnedBadgeIds, onOpenModal }: BadgesPreviewProps) {
  const t = useTranslations('badges');

  const totalBadges = BADGE_DEFINITIONS.length;
  const earnedCount = earnedBadgeIds.length;
  const progressPct = totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;

  // 5 derniers badges obtenus dans l'ordre stable de BADGE_DEFINITIONS
  const recentBadges = BADGE_DEFINITIONS
    .filter((b) => earnedBadgeIds.includes(b.id))
    .slice(-5);

  return (
    <section className="badges-preview" aria-label={t('sectionTitle')}>

      {/* ── En-tête : titre + compteur ──────────────────────────────── */}
      <div className="badges-preview__header">
        <h2 className="badges-preview__title">{t('sectionTitle')}</h2>
        <span className="badges-preview__count">{earnedCount} / {totalBadges}</span>
      </div>

      {/* ── Barre de progression ────────────────────────────────────── */}
      <div className="badges-preview__bar-track" role="progressbar" aria-valuenow={earnedCount} aria-valuemin={0} aria-valuemax={totalBadges}>
        <div className="badges-preview__bar-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* ── Derniers badges obtenus (ou message vide) ───────────────── */}
      {recentBadges.length > 0 ? (
        <div className="badges-preview__recent" aria-label="Derniers badges obtenus">
          {recentBadges.map((badge) => (
            <div
              key={badge.id}
              className="badges-preview__badge"
              title={t(`${badge.id}_name` as Parameters<typeof t>[0])}
              aria-label={t(`${badge.id}_name` as Parameters<typeof t>[0])}
            >
              <span aria-hidden="true">{badge.emoji}</span>
            </div>
          ))}
          {earnedCount > 5 && (
            <div className="badges-preview__badge badges-preview__badge--more">
              <span aria-hidden="true">+{earnedCount - 5}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="badges-preview__empty">{t('previewEmpty')}</p>
      )}

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        className="badges-preview__cta"
        onClick={onOpenModal}
      >
        {t('seeAllCta')} →
      </button>
    </section>
  );
}
