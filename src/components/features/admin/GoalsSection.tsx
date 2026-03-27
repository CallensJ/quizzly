'use client';
/**
 * src/components/features/admin/GoalsSection.tsx
 *
 * Section de configuration des objectifs par catégorie — espace parent.
 * Permet de définir un score % minimum par catégorie (semaine ISO courante).
 * Les valeurs sont flushées vers le store Zustand au clic "Enregistrer".
 * TODO: gate premium (Stripe) — toujours visible en dev
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Target } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import type { GoalCategory } from '@/types';

const CATEGORIES: GoalCategory[] = ['sciences', 'histoire', 'heroes'];
const TARGET_OPTIONS = [50, 60, 70, 80, 90];

// null/absent key in local state = catégorie désactivée
type LocalGoals = Partial<Record<GoalCategory, number>>;

export default function GoalsSection() {
  const t = useTranslations('admin');

  const categoryGoals    = useProfileStore((s) => s.categoryGoals);
  const setCategoryGoal  = useProfileStore((s) => s.setCategoryGoal);

  // Initialisation : on ne garde que les valeurs présentes dans TARGET_OPTIONS.
  // Toute valeur absente ou hors liste = désactivé (clé absente dans localGoals).
  const [localGoals, setLocalGoals] = useState<LocalGoals>(() => {
    const init: LocalGoals = {};
    for (const cat of CATEGORIES) {
      const stored = categoryGoals[cat];
      if (stored !== undefined && TARGET_OPTIONS.includes(stored)) {
        init[cat] = stored;
      }
    }
    return init;
  });

  const [saved, setSaved] = useState(false);

  function handleSelect(cat: GoalCategory, value: number | null) {
    setLocalGoals((prev) => {
      const next = { ...prev };
      if (value === null) {
        delete next[cat];
      } else {
        next[cat] = value;
      }
      return next;
    });
  }

  function handleSave() {
    for (const cat of CATEGORIES) {
      const value = localGoals[cat];
      if (typeof value === 'number') {
        setCategoryGoal(cat, value);
      } else {
        setCategoryGoal(cat, null);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <section
      className="admin__section admin__section--cat-goals"
      aria-labelledby="admin-cat-goals-title"
    >
      <div className="admin__section-header">
        <Target size={18} strokeWidth={2} aria-hidden="true" />
        <h2 id="admin-cat-goals-title" className="admin__section-title">
          {t('categoryGoalsTitle')}
        </h2>
      </div>
      <p className="admin__section-desc">{t('categoryGoalsDesc')}</p>

      <ul className="admin__cat-goals-list" role="list">
        {CATEGORIES.map((cat) => {
          const active = localGoals[cat] ?? null;
          return (
            <li key={cat} className="admin__cat-goals-item">
              <span className="admin__cat-goals-name">{t(cat)}</span>
              <div
                className="admin__cat-goals-options"
                role="group"
                aria-label={t(cat)}
              >
                {/* Bouton Désactivé */}
                <button
                  type="button"
                  className={`admin__cat-goals-btn${active === null ? ' admin__cat-goals-btn--active' : ''}`}
                  onClick={() => handleSelect(cat, null)}
                  aria-pressed={active === null}
                >
                  {t('categoryGoalsDisabled')}
                </button>

                {/* Boutons de pourcentage */}
                {TARGET_OPTIONS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className={`admin__cat-goals-btn${active === pct ? ' admin__cat-goals-btn--active' : ''}`}
                    onClick={() => handleSelect(cat, pct)}
                    aria-pressed={active === pct}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="admin__save-btn"
        onClick={handleSave}
      >
        {saved ? (
          <>
            <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            {t('categoryGoalsSaved')}
          </>
        ) : (
          t('categoryGoalsSave')
        )}
      </button>
    </section>
  );
}
