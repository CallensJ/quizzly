'use client';

// src/components/ui/ThemePicker.tsx
// Sélecteur de thème de couleur — 3 options : Classique / Bleu / Rose.
// Utilisé dans OnboardingScreen et ProfileScreen.

import { useTranslations } from 'next-intl';
import type { AppTheme } from '@/types';

interface ThemePickerProps {
  value: AppTheme;
  onChange: (theme: AppTheme) => void;
}

const THEMES: { id: AppTheme; color: string; emoji: string }[] = [
  { id: 'default', color: '#667eea', emoji: '✨' },
  { id: 'blue',    color: '#0046FF', emoji: '🌊' },
  { id: 'pink',    color: '#F5AFAF', emoji: '🌸' },
];

export default function ThemePicker({ value, onChange }: ThemePickerProps) {
  const t = useTranslations('theme');

  return (
    <div className="theme-picker" role="group" aria-label={t('label')}>
      {THEMES.map(({ id, color, emoji }) => (
        <button
          key={id}
          type="button"
          className={`theme-picker__btn${value === id ? ' theme-picker__btn--active' : ''}`}
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          aria-label={t(id)}
        >
          <span
            className="theme-picker__swatch"
            style={{ background: color }}
            aria-hidden="true"
          />
          <span className="theme-picker__label">
            {emoji} {t(id)}
          </span>
        </button>
      ))}
    </div>
  );
}
