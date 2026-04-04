'use client';

/**
 * src/components/features/recommendations/RecommendationsSection.tsx
 *
 * Section "Recommandations pédagogiques" (MVP 4).
 * Affiche jusqu'à 3 suggestions de catégorie/niveau basées sur les sessions de jeu.
 *
 * Chaque carte contient :
 *   - Une icône et un badge de type (niveau sup, entraînement, découverte…)
 *   - Un titre et un message contextuel
 *   - Un CTA "Jouer" qui pré-sélectionne catégorie + difficulté et redirige vers /home
 *
 * Intégration : StatsScreen (enfant) + DashboardScreen (parent)
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useQuizStore } from '@/stores/quizStore';
import { getRecommendations, type Recommendation, type RecommendationType } from '@/lib/recommendations';
import { TrendingUp, Dumbbell, Sparkles, Shuffle } from 'lucide-react';
import type { Category, Difficulty } from '@/types';

// ─── Icônes et couleurs par type ─────────────────────────────────────────────

const TYPE_META: Record<RecommendationType, {
  icon: React.ReactNode;
  colorClass: string;
}> = {
  level_up:  { icon: <TrendingUp  size={18} />, colorClass: 'rec__card--level-up'  },
  practice:  { icon: <Dumbbell    size={18} />, colorClass: 'rec__card--practice'  },
  try_new:   { icon: <Sparkles    size={18} />, colorClass: 'rec__card--try-new'   },
  diversify: { icon: <Shuffle     size={18} />, colorClass: 'rec__card--diversify' },
};

// Couleurs des catégories (design system)
const CAT_COLORS: Partial<Record<Category, string>> = {
  sciences:            '#2196F3',
  histoire:            '#795548',
  heroes:              '#E91E63',
  'animaux-nature':    '#8BC34A',
  math:                '#FF9800',
  sport:               '#4CAF50',
  geographie:          '#00BCD4',
  francais:            '#795548',
  anglais:             '#C62828',
  art:                 '#FF5722',
  'corps-humain':      '#E91E63',
  cuisine:             '#FF9800',
  dinosaures:          '#6D4C41',
  'education-civique': '#607D8B',
  environnement:       '#2E7D32',
  'espace-astronomie': '#1A237E',
  musique:             '#F06292',
  'pop-culture':       '#FF4081',
  technologie:         '#009688',
  mythology:           '#7B1FA2',
};

// ─── Composant carte individuelle ────────────────────────────────────────────

interface RecCardProps {
  rec: Recommendation;
  onPlay: (category: Category, difficulty: Difficulty) => void;
}

function RecCard({ rec, onPlay }: RecCardProps) {
  const t = useTranslations('recommendations');
  const { type, category, difficulty, avgScore } = rec;
  const meta = TYPE_META[type];

  const titleKey = `${type}Title` as const;
  const descKey  = `${type}Desc`  as const;

  // Traduit la catégorie et la difficulté pour les messages
  const tCat  = useTranslations('home');
  const tDiff = useTranslations('home');

  const catLabel  = tCat(category as 'sciences' | 'histoire' | 'heroes');
  const diffLabel = tDiff(difficulty as 'easy' | 'medium' | 'hard');

  return (
    <div className={`rec__card ${meta.colorClass}`}>
      <div className="rec__card-header">
        <span className="rec__card-icon" aria-hidden="true">
          {meta.icon}
        </span>
        <span className="rec__card-type-label">
          {t(`${type}Badge` as Parameters<typeof t>[0])}
        </span>
      </div>

      <div className="rec__card-body">
        {/* Pastille catégorie */}
        <span
          className="rec__cat-pill"
          style={{ background: CAT_COLORS[category] }}
        >
          {catLabel}
        </span>

        <h3 className="rec__card-title">
          {t(titleKey, { category: catLabel, difficulty: diffLabel })}
        </h3>
        <p className="rec__card-desc">
          {t(descKey, {
            category: catLabel,
            difficulty: diffLabel,
            score: avgScore ?? 0,
          })}
        </p>
      </div>

      <button
        type="button"
        className="rec__card-cta"
        onClick={() => onPlay(category, difficulty)}
        aria-label={t('playAriaLabel', { category: catLabel, difficulty: diffLabel })}
      >
        {t('playCta')} →
      </button>
    </div>
  );
}

// ─── Composant section ───────────────────────────────────────────────────────

interface RecommendationsSectionProps {
  /** Si true, affiche dans un contexte parent (titre légèrement différent) */
  parentView?: boolean;
}

export default function RecommendationsSection({ parentView = false }: RecommendationsSectionProps) {
  const t           = useTranslations('recommendations');
  const sessions    = useProfileStore((s) => s.sessions);
  const profile     = useProfileStore((s) => s.profile);
  const setCategory  = useQuizStore((s) => s.setCategory);
  const setDifficulty = useQuizStore((s) => s.setDifficulty);
  const router      = useRouter();

  const recommendations = useMemo(() => getRecommendations(sessions), [sessions]);

  function handlePlay(category: Category, difficulty: Difficulty) {
    setCategory(category);
    setDifficulty(difficulty);
    router.push('/home');
  }

  if (recommendations.length === 0) return null;

  return (
    <section className="rec" aria-labelledby="rec-title">
      <div className="rec__header">
        <h2 id="rec-title" className="rec__title">
          {parentView
            ? t('titleParent', { pseudo: profile?.pseudo ?? '' })
            : t('title')}
        </h2>
        <p className="rec__subtitle">{t('subtitle')}</p>
      </div>

      <div className="rec__list">
        {recommendations.map((rec, i) => (
          <RecCard
            key={`${rec.category}-${rec.difficulty}-${i}`}
            rec={rec}
            onPlay={handlePlay}
          />
        ))}
      </div>
    </section>
  );
}
