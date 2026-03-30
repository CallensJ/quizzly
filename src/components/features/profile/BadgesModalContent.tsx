'use client';

/**
 * src/components/features/profile/BadgesModalContent.tsx
 *
 * Contenu scrollable de la modale trophées.
 * - Barre de progression globale (earned / total tous badges)
 * - Filtres : Tous / Obtenus / À débloquer
 * - Liste des groupes en accordéon (BadgeGroupAccordion)
 *
 * Le filtre "Obtenus" masque les groupes sans aucun badge obtenu.
 * Le filtre "À débloquer" masque les groupes entièrement complétés.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BADGE_DEFINITIONS, BADGE_GROUPS } from '@/lib/badges';
import BadgeGroupAccordion from './BadgeGroupAccordion';

type Filter = 'all' | 'earned' | 'locked';

interface BadgesModalContentProps {
  earnedBadgeIds: string[];
}

export default function BadgesModalContent({ earnedBadgeIds }: BadgesModalContentProps) {
  const t = useTranslations('badges');
  const [filter, setFilter] = useState<Filter>('all');

  const totalBadges = BADGE_DEFINITIONS.length;
  const earnedCount = earnedBadgeIds.length;
  const progressPct = totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;

  const visibleGroups = BADGE_GROUPS.filter((group) => {
    if (filter === 'earned') return group.badgeIds.some((id) => earnedBadgeIds.includes(id));
    if (filter === 'locked') return group.badgeIds.some((id) => !earnedBadgeIds.includes(id));
    return true;
  });

  const FILTERS: { key: Filter; labelKey: string }[] = [
    { key: 'all',    labelKey: 'filterAll'    },
    { key: 'earned', labelKey: 'filterEarned' },
    { key: 'locked', labelKey: 'filterLocked' },
  ];

  return (
    <div className="badges-modal__content">

      {/* ── Progression globale ─────────────────────────────────────────── */}
      <div className="badges-modal__global">
        <div className="badges-modal__global-bar">
          <div
            className="badges-modal__global-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="badges-modal__global-count">
          {earnedCount} / {totalBadges}
        </span>
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="badges-modal__filters" role="tablist">
        {FILTERS.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            role="tab"
            className={`badges-modal__filter${filter === key ? ' badges-modal__filter--active' : ''}`}
            onClick={() => setFilter(key)}
            aria-selected={filter === key}
          >
            {t(labelKey as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {/* ── Groupes accordéon ───────────────────────────────────────────── */}
      <div className="badges-modal__groups">
        {visibleGroups.map((group) => {
          const hasEarned = group.badgeIds.some((id) => earnedBadgeIds.includes(id));
          return (
            <BadgeGroupAccordion
              key={group.id}
              group={group}
              earnedBadgeIds={earnedBadgeIds}
              defaultOpen={hasEarned}
            />
          );
        })}
      </div>
    </div>
  );
}
