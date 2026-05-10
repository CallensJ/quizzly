'use client';

/**
 * src/components/features/profile/BadgeGroupAccordion.tsx
 *
 * Accordéon d'un groupe de badges.
 * Header cliquable : emoji + nom + progression (earned/total) + barre colorée.
 * Body animé via grid-template-rows (0fr → 1fr) — pas de JS pour calculer la hauteur.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { BADGE_DEFINITIONS, getGroupProgress, type BadgeGroup } from '@/lib/badges';
import { useProfileStore } from '@/stores/profileStore';
import BadgeTile from './BadgeTile';

interface BadgeGroupAccordionProps {
  group: BadgeGroup;
  earnedBadgeIds: string[];
  /** Ouvert par défaut si le groupe contient au moins un badge obtenu */
  defaultOpen?: boolean;
}

export default function BadgeGroupAccordion({
  group,
  earnedBadgeIds,
  defaultOpen = false,
}: BadgeGroupAccordionProps) {
  const t = useTranslations('badges');
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const sessions     = useProfileStore((s) => s.sessions);
  const dailyStreak  = useProfileStore((s) => s.dailyStreak);
  const progress     = getGroupProgress(group, sessions, earnedBadgeIds, dailyStreak, earnedBadgeIds.length);

  const badges = group.badgeIds
    .map((id) => BADGE_DEFINITIONS.find((b) => b.id === id))
    .filter(Boolean) as typeof BADGE_DEFINITIONS;

  const earnedCount = group.badgeIds.filter((id) => earnedBadgeIds.includes(id)).length;
  const total       = group.badgeIds.length;
  const progressPct = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

  return (
    <div
      className={`badge-group${isOpen ? ' badge-group--open' : ''}`}
      style={{ '--group-color': group.color } as React.CSSProperties}
    >
      {/* ── Header cliquable ────────────────────────────────────────────── */}
      <button
        type="button"
        className="badge-group__header"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={`badge-group-body-${group.id}`}
      >
        <span className="badge-group__emoji" aria-hidden="true">{group.emoji}</span>
        <span className="badge-group__label">
          {t(group.labelKey as Parameters<typeof t>[0])}
        </span>

        <div className="badge-group__progress">
          <div className="badge-group__progress-track">
            <div
              className="badge-group__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="badge-group__count">{earnedCount}/{total}</span>
        </div>

        <ChevronDown size={18} className="badge-group__chevron" aria-hidden="true" />
      </button>

      {/* ── Body animé ──────────────────────────────────────────────────── */}
      <div
        id={`badge-group-body-${group.id}`}
        className="badge-group__body"
      >
        {/* Wrapper interne requis pour l'animation grid-template-rows 0fr→1fr */}
        <div className="badge-group__body-inner">
          <div className="badge-group__grid">
            {badges.map((badge) => {
              const earned = earnedBadgeIds.includes(badge.id);
              return (
                <BadgeTile
                  key={badge.id}
                  emoji={badge.emoji}
                  name={t(`${badge.id}_name` as Parameters<typeof t>[0])}
                  desc={t(`${badge.id}_desc` as Parameters<typeof t>[0])}
                  earned={earned}
                />
              );
            })}
          </div>

          {/* ── Progression vers le prochain badge ──────────────────────── */}
          {progress && (
            <div className="badge-group__next">
              {progress.complete ? (
                <p className="badge-group__next-complete">
                  ✅ {t('groupComplete')}
                </p>
              ) : (
                <>
                  <p className="badge-group__next-label">
                    <span aria-hidden="true">{progress.nextBadgeEmoji}</span>
                    {t('nextBadge')} : <strong>{t(`${progress.nextBadgeId}_name` as Parameters<typeof t>[0])}</strong>
                  </p>
                  <div className="badge-group__next-track" role="progressbar" aria-valuenow={progress.current} aria-valuemin={0} aria-valuemax={progress.target}>
                    <div
                      className="badge-group__next-fill"
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                  <p className="badge-group__next-meta">
                    <span className="badge-group__next-count">{progress.current} / {progress.target}</span>
                    <span className="badge-group__next-unit">{t(progress.unitKey as Parameters<typeof t>[0])}</span>
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
