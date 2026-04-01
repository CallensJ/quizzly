'use client';

/**
 * src/components/features/admin/AdminEmailSection.tsx
 *
 * Section de configuration de l'email adulte — espace parent.
 * Permet de renseigner l'email de contact pour les rapports PDF.
 *
 * Validation : Zod (AdminEmailSchema) + normalisation lowercase/trim.
 * Persistence : profileStore (Zustand) + sync Supabase via syncAdminSettings.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import { syncAdminSettings } from '@/lib/sync';
import { AdminEmailSchema } from '@/lib/schemas/auth';

export default function AdminEmailSection() {
  const t = useTranslations('admin');

  const adminEmail   = useProfileStore((s) => s.adminEmail);
  const dailyGoal    = useProfileStore((s) => s.dailyGoal);
  const deviceId     = useProfileStore((s) => s.deviceId);
  const setAdminEmail = useProfileStore((s) => s.setAdminEmail);

  const [emailInput, setEmailInput]     = useState<string>(adminEmail ?? '');
  const [emailFeedback, setEmailFeedback] = useState<'saved' | 'error' | null>(null);

  function handleSave() {
    // Normalisation : lowercase + trim avant validation et stockage
    const normalized = emailInput.toLowerCase().trim();
    if (normalized !== '') {
      const validation = AdminEmailSchema.safeParse({ email: normalized });
      if (!validation.success) {
        setEmailFeedback('error');
        setTimeout(() => setEmailFeedback(null), 3000);
        return;
      }
    }
    const value = normalized === '' ? null : normalized;
    setAdminEmail(value);
    if (deviceId) syncAdminSettings(deviceId, dailyGoal, value);
    setEmailFeedback('saved');
    setTimeout(() => setEmailFeedback(null), 2500);
  }

  function handleRemove() {
    setEmailInput('');
    setAdminEmail(null);
    if (deviceId) syncAdminSettings(deviceId, dailyGoal, null);
  }

  return (
    <section
      className="admin__section admin__section--email"
      aria-labelledby="admin-email-title"
    >
      <div className="admin__section-header">
        <Mail size={18} strokeWidth={2} aria-hidden="true" />
        <h2 id="admin-email-title" className="admin__section-title">
          {t('emailTitle')}
        </h2>
      </div>
      <p className="admin__section-desc">{t('emailDesc')}</p>

      <div className="admin__email-field">
        <input
          type="email"
          className={`admin__email-input${emailFeedback === 'error' ? ' admin__email-input--error' : ''}`}
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder={t('emailPlaceholder')}
          autoComplete="email"
          aria-label={t('emailTitle')}
        />
        <button
          type="button"
          className="admin__save-btn"
          onClick={handleSave}
        >
          {emailFeedback === 'saved' ? t('emailSaved') : t('emailSave')}
        </button>
      </div>

      {emailFeedback === 'error' && (
        <p className="admin__feedback admin__feedback--error">
          {t('emailInvalid')}
        </p>
      )}

      {adminEmail && (
        <button
          type="button"
          className="admin__email-remove"
          onClick={handleRemove}
        >
          {t('emailRemove')}
        </button>
      )}
    </section>
  );
}
