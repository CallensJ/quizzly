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
import { BADGE_DEFINITIONS, type BadgeGroup } from '@/lib/badges';
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
        </div>
      </div>
    </div>
  );
}
