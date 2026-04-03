'use client';

/**
 * src/components/features/home/MythologyPanel.tsx
 *
 * Panneau des sous-catégories de Mythologie — s'affiche en tiroir inline
 * sous la carte parente quand l'utilisateur clique dessus.
 *
 * Pour chaque sous-catégorie :
 *  - Gratuit (greco-roman) : toujours sélectionnable si `available`
 *  - Débloqué (premium + critères atteints) : sélectionnable si `available`
 *  - Verrouillé (critères non atteints) : barre de progression + seuil
 *  - Bientôt disponible (available=false) : badge "Bientôt"
 *
 * Les icônes sont des emoji correspondant à chaque civilisation.
 */

import { useTranslations } from 'next-intl';
import { Lock, Sparkles } from 'lucide-react';
import {
  MYTH_SUBCATEGORIES,
  getMythUnlockProgress,
  type MythSubcategoryConfig,
} from '@/lib/mythology';
import type { MythSubcategory, QuizSession } from '@/types';

// ── Icônes emoji par civilisation ─────────────────────────────────────────

const MYTH_ICONS: Record<MythSubcategory, string> = {
  'greco-roman': '🏛️',
  egypt:         '🔱',
  nordic:        '⚡',
  celtic:        '🍀',
  amerindian:    '🦅',
  asian:         '🐉',
  african:       '🦁',
};

// ── Types ──────────────────────────────────────────────────────────────────

interface MythologyPanelProps {
  sessions: QuizSession[];
  isPremium: boolean;
  unlockedSubcategories: Set<MythSubcategory>;
  selectedSubcategory: MythSubcategory | null;
  onSelect: (sub: MythSubcategory) => void;
  onSubscribe: () => void;
}

// ── Composant ─────────────────────────────────────────────────────────────

export default function MythologyPanel({
  sessions,
  isPremium,
  unlockedSubcategories,
  selectedSubcategory,
  onSelect,
  onSubscribe,
}: MythologyPanelProps) {
  const t = useTranslations('home');

  return (
    <div className="myth-panel" role="list" aria-label={t('mythPanelLabel')}>
      {MYTH_SUBCATEGORIES.map((sub) => (
        <MythSubCard
          key={sub.id}
          config={sub}
          sessions={sessions}
          isPremium={isPremium}
          isUnlocked={unlockedSubcategories.has(sub.id)}
          isSelected={selectedSubcategory === sub.id}
          onSelect={onSelect}
          onSubscribe={onSubscribe}
          t={t}
        />
      ))}
    </div>
  );
}

// ── Sous-composant : carte d'une civilisation ──────────────────────────────

interface MythSubCardProps {
  config: MythSubcategoryConfig;
  sessions: QuizSession[];
  isPremium: boolean;
  isUnlocked: boolean;
  isSelected: boolean;
  onSelect: (sub: MythSubcategory) => void;
  onSubscribe: () => void;
  t: ReturnType<typeof useTranslations<'home'>>;
}

function MythSubCard({
  config,
  sessions,
  isPremium,
  isUnlocked,
  isSelected,
  onSelect,
  onSubscribe,
  t,
}: MythSubCardProps) {
  const { id, i18nKey, color, free, available } = config;

  const isPlayable  = isUnlocked && available;
  // Non premium et non gratuit → montrer CTA abonnement
  const needsPremium = !free && !isPremium;
  // Premium mais critères non atteints → progression
  const isLocked = !free && isPremium && !isUnlocked;
  // Contenu pas encore disponible
  const comingSoon = !available;

  const progress = isLocked ? getMythUnlockProgress(sessions, id) : null;

  // ── Interactivité ────────────────────────────────────────────────────────

  function handleClick() {
    if (isPlayable) {
      onSelect(id);
    } else if (needsPremium) {
      onSubscribe();
    }
    // isLocked ou comingSoon → pas d'action
  }

  // ── Classes CSS ──────────────────────────────────────────────────────────

  const classes = [
    'myth-card',
    isSelected   ? 'myth-card--selected'    : '',
    isPlayable   ? 'myth-card--playable'    : '',
    isLocked     ? 'myth-card--locked'      : '',
    needsPremium ? 'myth-card--premium-cta' : '',
    comingSoon   ? 'myth-card--coming-soon' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      role="listitem"
      className={classes}
      style={{ '--myth-color': color } as React.CSSProperties}
      onClick={handleClick}
      aria-pressed={isSelected}
      aria-disabled={!isPlayable && !needsPremium}
      aria-label={[
        t(i18nKey as Parameters<typeof t>[0]),
        comingSoon   ? t('comingSoonTag')  : '',
        needsPremium ? t('premiumLocked')  : '',
        isLocked     ? t('mythLocked')     : '',
      ].filter(Boolean).join(' — ')}
    >
      {/* Icône civilisation */}
      <span className="myth-card__icon" aria-hidden="true">
        {MYTH_ICONS[id]}
      </span>

      {/* Nom */}
      <span className="myth-card__name">
        {t(i18nKey as Parameters<typeof t>[0])}
      </span>

      {/* Badges et états */}
      {free && (
        <span className="myth-card__badge myth-card__badge--free" aria-hidden="true">
          {t('freeTag')}
        </span>
      )}

      {comingSoon && !free && (
        <span className="myth-card__badge myth-card__badge--soon" aria-hidden="true">
          🚀
        </span>
      )}

      {needsPremium && !comingSoon && (
        <Lock size={14} className="myth-card__lock" aria-hidden="true" />
      )}

      {isLocked && !comingSoon && (
        <span className="myth-card__lock-wrap" aria-hidden="true">
          <Lock size={14} className="myth-card__lock" />
        </span>
      )}

      {/* Barre de progression pour les sous-catégories verrouillées (premium) */}
      {isLocked && progress && (
        <div className="myth-card__progress" aria-hidden="true">
          <div
            className="myth-card__progress-bar"
            style={{ width: `${Math.min(100, Math.round((progress.current / progress.required) * 100))}%` }}
          />
          <span className="myth-card__progress-label">
            {progress.current}/{progress.required}
            {progress.type === 'correct' ? ` ${t('mythUnlockCorrect')}` : ` ${t('mythUnlockSessions')}`}
          </span>
        </div>
      )}

      {/* Icône Premium CTA */}
      {needsPremium && !comingSoon && (
        <Sparkles size={12} className="myth-card__sparkle" aria-hidden="true" />
      )}
    </button>
  );
}
