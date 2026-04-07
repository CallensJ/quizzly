'use client';
/**
 * src/components/features/admin/GoalsSection.tsx
 *
 * Section objectifs par catégorie — espace parent.
 * Redesignée pour supporter toutes les catégories (18 au total).
 *
 * UX : stepper –/+ compact par ligne, liste scrollable groupée
 *      (Gratuites / Premium), save global unique.
 * Options : Off → 20% → 30% → … → 90% (par pas de 10).
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import type { GoalCategory } from '@/types';

// ── Données ──────────────────────────────────────────────────────────────────

const TARGET_OPTIONS = [20, 30, 40, 50, 60, 70, 80, 90];

interface CatDef {
  id: GoalCategory;
  label: string;
  color: string;
}

const FREE_CATEGORIES: CatDef[] = [
  { id: 'sciences',       label: 'Sciences',         color: '#2196F3' },
  { id: 'histoire',       label: 'Histoire',          color: '#795548' },
  { id: 'heroes',         label: 'Héros & Aventures', color: '#E91E63' },
  { id: 'animaux-nature', label: 'Animaux & Nature',  color: '#8BC34A' },
];

const PREMIUM_CATEGORIES: CatDef[] = [
  { id: 'sport',             label: 'Sport',                    color: '#4CAF50' },
  { id: 'geographie',        label: 'Géographie',               color: '#00BCD4' },
  { id: 'francais',          label: 'Français',                 color: '#1565C0' },
  { id: 'anglais',           label: 'Anglais',                  color: '#C62828' },
  { id: 'art',               label: 'Art',                      color: '#FF5722' },
  { id: 'pop-culture',       label: 'Culture Pop',              color: '#FF4081' },
  { id: 'education-civique', label: 'Éducation Civique',        color: '#607D8B' },
  { id: 'cuisine',           label: 'Cuisine & Alimentation',   color: '#FF9800' },
  { id: 'technologie',       label: 'Technologie',              color: '#009688' },
  { id: 'espace-astronomie', label: 'Espace & Astronomie',      color: '#1A237E' },
  { id: 'corps-humain',      label: 'Corps humain & Santé',     color: '#26A69A' },
  { id: 'musique',           label: 'Musique',                  color: '#AB47BC' },
  { id: 'environnement',     label: 'Environnement & Écologie', color: '#2E7D32' },
  { id: 'dinosaures',        label: 'Dinosaures',               color: '#6D4C41' },
];

// ── Types ────────────────────────────────────────────────────────────────────

type LocalGoals = Partial<Record<GoalCategory, number>>;

// ── Stepper row ───────────────────────────────────────────────────────────────

interface StepperRowProps {
  cat: CatDef;
  value: number | null;
  onChange: (val: number | null) => void;
}

function StepperRow({ cat, value, onChange }: StepperRowProps) {
  const currentIndex = value === null ? -1 : TARGET_OPTIONS.indexOf(value);

  function decrement() {
    if (currentIndex <= 0) {
      onChange(null);
    } else {
      onChange(TARGET_OPTIONS[currentIndex - 1]);
    }
  }

  function increment() {
    if (currentIndex === -1) {
      onChange(TARGET_OPTIONS[0]);
    } else if (currentIndex < TARGET_OPTIONS.length - 1) {
      onChange(TARGET_OPTIONS[currentIndex + 1]);
    }
  }

  const isMin = value === null;
  const isMax = value === TARGET_OPTIONS[TARGET_OPTIONS.length - 1];

  return (
    <li className="goals-section__row">
      {/* Pastille couleur + nom */}
      <span
        className="goals-section__dot"
        style={{ background: cat.color }}
        aria-hidden="true"
      />
      <span className="goals-section__cat-name">{cat.label}</span>

      {/* Stepper */}
      <div className="goals-section__stepper" role="group" aria-label={`Objectif ${cat.label}`}>
        <button
          type="button"
          className="goals-section__step-btn"
          onClick={decrement}
          disabled={isMin}
          aria-label="Diminuer l'objectif"
        >
          <ChevronDown size={14} strokeWidth={2.5} />
        </button>

        <span
          className={`goals-section__step-value${value === null ? ' goals-section__step-value--off' : ''}`}
          aria-live="polite"
          aria-label={value === null ? 'Désactivé' : `${value}%`}
        >
          {value === null ? '—' : `${value}%`}
        </span>

        <button
          type="button"
          className="goals-section__step-btn"
          onClick={increment}
          disabled={isMax}
          aria-label="Augmenter l'objectif"
        >
          <ChevronUp size={14} strokeWidth={2.5} />
        </button>
      </div>
    </li>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function GoalsSection() {
  const t = useTranslations('admin');

  const categoryGoals   = useProfileStore((s) => s.categoryGoals);
  const setCategoryGoal = useProfileStore((s) => s.setCategoryGoal);

  // Initialisation : ne garder que les valeurs dans TARGET_OPTIONS
  const [localGoals, setLocalGoals] = useState<LocalGoals>(() => {
    const init: LocalGoals = {};
    const all = [...FREE_CATEGORIES, ...PREMIUM_CATEGORIES];
    for (const { id } of all) {
      const stored = categoryGoals[id];
      if (stored !== undefined && TARGET_OPTIONS.includes(stored)) {
        init[id] = stored;
      }
    }
    return init;
  });

  const [saved, setSaved] = useState(false);

  function handleChange(cat: GoalCategory, value: number | null) {
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
    const all = [...FREE_CATEGORIES, ...PREMIUM_CATEGORIES];
    for (const { id } of all) {
      const value = localGoals[id];
      setCategoryGoal(id, typeof value === 'number' ? value : null);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Compte des objectifs actifs
  const activeCount = Object.keys(localGoals).length;

  return (
    <section
      className="admin__section admin__section--cat-goals"
      aria-labelledby="admin-cat-goals-title"
    >
      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <div className="admin__section-header">
        <Target size={18} strokeWidth={2} aria-hidden="true" />
        <h2 id="admin-cat-goals-title" className="admin__section-title">
          {t('categoryGoalsTitle')}
        </h2>
        {activeCount > 0 && (
          <span className="goals-section__active-badge" aria-label={`${activeCount} objectifs actifs`}>
            {activeCount}
          </span>
        )}
      </div>
      <p className="admin__section-desc">{t('categoryGoalsDesc')}</p>

      {/* ── Liste scrollable ─────────────────────────────────────────────────── */}
      <div className="goals-section__scroll-area">

        {/* Groupe Gratuites */}
        <div className="goals-section__group">
          <span className="goals-section__group-label">Gratuites</span>
          <ul className="goals-section__list" role="list">
            {FREE_CATEGORIES.map((cat) => (
              <StepperRow
                key={cat.id}
                cat={cat}
                value={localGoals[cat.id] ?? null}
                onChange={(val) => handleChange(cat.id, val)}
              />
            ))}
          </ul>
        </div>

        {/* Groupe Premium */}
        <div className="goals-section__group">
          <span className="goals-section__group-label goals-section__group-label--premium">
            Premium
          </span>
          <ul className="goals-section__list" role="list">
            {PREMIUM_CATEGORIES.map((cat) => (
              <StepperRow
                key={cat.id}
                cat={cat}
                value={localGoals[cat.id] ?? null}
                onChange={(val) => handleChange(cat.id, val)}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* ── Bouton enregistrer ───────────────────────────────────────────────── */}
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
