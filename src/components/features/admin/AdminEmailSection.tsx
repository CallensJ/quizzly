'use client';

/**
 * src/components/features/admin/AdminEmailSection.tsx
 *
 * Section de configuration de l'email adulte — espace parent.
 * Permet de renseigner l'email de contact pour les rapports PDF.
 *
 * RGPD Art. 6.1.a : collecte conditionnée à un consentement explicite via checkbox.
 * Sans consentement coché, l'email ne peut pas être sauvegardé.
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

  const adminEmail        = useProfileStore((s) => s.adminEmail);
  const emailConsent      = useProfileStore((s) => s.emailConsent);
  const dailyGoal         = useProfileStore((s) => s.dailyGoal);
  const activeProfileId   = useProfileStore((s) => s.activeProfileId);
  const setAdminEmail     = useProfileStore((s) => s.setAdminEmail);
  const setEmailConsent   = useProfileStore((s) => s.setEmailConsent);

  const [emailInput, setEmailInput]           = useState<string>(adminEmail ?? '');
  const [consentChecked, setConsentChecked]   = useState<boolean>(emailConsent);
  const [emailFeedback, setEmailFeedback]     = useState<'saved' | 'error' | null>(null);

  function handleSave() {
    // Consentement RGPD obligatoire avant toute sauvegarde
    if (!consentChecked) {
      setEmailFeedback('error');
      setTimeout(() => setEmailFeedback(null), 3000);
      return;
    }

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
    setEmailConsent(true);
    if (activeProfileId) syncAdminSettings(activeProfileId, dailyGoal, value, undefined, true);
    setEmailFeedback('saved');
    setTimeout(() => setEmailFeedback(null), 2500);
  }

  function handleRemove() {
    setEmailInput('');
    setAdminEmail(null);
    setConsentChecked(false);
    setEmailConsent(false);
    // Retrait du consentement → email effacé en DB (consent_email = false)
    if (activeProfileId) syncAdminSettings(activeProfileId, dailyGoal, null, undefined, false);
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
          disabled={!consentChecked}
          aria-disabled={!consentChecked}
        >
          {emailFeedback === 'saved' ? t('emailSaved') : t('emailSave')}
        </button>
      </div>

      {/* Consentement email parent — RGPD Art. 7 */}
      <div className="admin__email-consent">
        <label className="admin__consent-label">
          <input
            type="checkbox"
            className="admin__consent-checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
          />
          <span className="admin__consent-text">
            {t('emailConsentLabel')}{' '}
            <a
              href="https://erudia.app/mentions.html#donnees"
              target="_blank"
              rel="noopener noreferrer"
              className="admin__consent-link"
            >
              {t('emailConsentLink')}
            </a>
          </span>
        </label>
      </div>

      {emailFeedback === 'error' && (
        <p className="admin__feedback admin__feedback--error" role="alert">
          {!consentChecked ? t('emailConsentRequired') : t('emailInvalid')}
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
