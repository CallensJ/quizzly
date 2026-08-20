'use client';

/**
 * src/components/features/admin/QuizLanguageSection.tsx
 *
 * Réglage de la langue du CONTENU des quiz — indépendant de la langue
 * d'interface (cahier-des-charges-claude-v1.4.md §5, bilinguisme découplé).
 * L'interface reste pilotée par le toggle 🇬🇧/🇫🇷 accessible à l'enfant
 * depuis Home ; ce réglage-ci est réservé au dashboard parental.
 */

import { useTranslations } from 'next-intl';
import { Languages, Check } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import type { Locale } from '@/types';

const OPTIONS: Locale[] = ['fr', 'en'];

export default function QuizLanguageSection() {
  const t = useTranslations('admin');
  const profile = useProfileStore((s) => s.profile);
  const setQuizLanguage = useProfileStore((s) => s.setQuizLanguage);

  if (!profile) return null;

  // Repli sur la langue d'interface courante si jamais réglée explicitement.
  const current = profile.quizLanguage ?? profile.locale;

  return (
    <section className="admin__section admin__section--quiz-language" aria-labelledby="admin-quizlang-title">
      <div className="admin__section-header">
        <Languages size={18} strokeWidth={2} aria-hidden="true" />
        <h2 id="admin-quizlang-title" className="admin__section-title">{t('quizLanguageTitle')}</h2>
      </div>
      <p className="admin__section-desc">{t('quizLanguageDesc')}</p>
      <div className="admin__quiz-language-options">
        {OPTIONS.map((lang) => (
          <button
            key={lang}
            type="button"
            className={`admin__quiz-language-btn${current === lang ? ' admin__quiz-language-btn--active' : ''}`}
            onClick={() => setQuizLanguage(lang)}
            aria-pressed={current === lang}
          >
            <span aria-hidden="true">{lang === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
            {t(lang === 'fr' ? 'quizLanguageFr' : 'quizLanguageEn')}
            {current === lang && <Check size={14} strokeWidth={3} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </section>
  );
}
