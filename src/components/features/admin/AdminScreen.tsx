'use client';

/**
 * src/components/features/admin/AdminScreen.tsx
 *
 * Espace parent/enseignant — accès protégé par PIN 4 chiffres.
 * Gère en interne le flux PIN :
 *   - Premier accès (adminPin === null) → modal création du PIN
 *   - Accès suivants → modal vérification du PIN
 *   - PIN validé → affiche le tableau de bord parent
 *
 * Fonctionnalités :
 *   - Stats enfant en lecture seule
 *   - Objectif journalier (bonnes réponses)
 *   - Modifier le PIN
 *   - Remettre la progression à zéro (irréversible)
 *   - Supprimer le compte (irréversible)
 *
 * Tout est en localStorage (MVP 2) — pas de backend.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Target, KeyRound, Trash2, RotateCcw, BarChart3, Mail } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { syncAdminSettings } from '@/lib/sync';
import PinModal from './PinModal';

// Validation basique d'une adresse email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valeurs possibles pour l'objectif journalier (0 = désactivé)
const GOAL_OPTIONS = [0, 5, 10, 15, 20, 30];

export default function AdminScreen() {
  const t = useTranslations('admin');
  const router = useRouter();

  const profile       = useProfileStore((s) => s.profile);
  const sessions      = useProfileStore((s) => s.sessions);
  const deviceId      = useProfileStore((s) => s.deviceId);
  const adminPin      = useProfileStore((s) => s.adminPin);
  const adminEmail    = useProfileStore((s) => s.adminEmail);
  const dailyGoal     = useProfileStore((s) => s.dailyGoal);
  const setAdminPin   = useProfileStore((s) => s.setAdminPin);
  const setAdminEmail = useProfileStore((s) => s.setAdminEmail);
  const setDailyGoal  = useProfileStore((s) => s.setDailyGoal);
  const resetProgress = useProfileStore((s) => s.resetProgress);
  const deleteProfile = useProfileStore((s) => s.deleteProfile);

  // ── État d'accès ────────────────────────────────────────────────────────────
  // 'pin-modal' : modal PIN visible (création ou vérification)
  // 'unlocked'  : PIN validé, tableau de bord visible
  const [access, setAccess] = useState<'pin-modal' | 'unlocked'>(
    // Premier accès sans PIN → directement en mode création (pas de PIN à vérifier)
    // Sinon → modal vérification
    'pin-modal'
  );

  // ── État UI ─────────────────────────────────────────────────────────────────
  // Modification du PIN — affiche un second modal de création par-dessus le dashboard
  const [changingPin, setChangingPin] = useState(false);

  // Confirmation des actions irréversibles
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Feedback temporaire
  const [goalFeedback, setGoalFeedback] = useState(false);
  const [pinFeedback, setPinFeedback] = useState(false);

  // Objectif journalier sélectionné localement (avant enregistrement)
  const [selectedGoal, setSelectedGoal] = useState<number>(dailyGoal ?? 0);

  // Email adulte — valeur locale du champ (peut diverger de adminEmail avant enregistrement)
  const [emailInput, setEmailInput] = useState<string>(adminEmail ?? '');
  const [emailFeedback, setEmailFeedback] = useState<'saved' | 'error' | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handlePinSuccess(pin: string) {
    setAdminPin(pin);
    setAccess('unlocked');
  }

  function handleChangePinSuccess(pin: string) {
    setAdminPin(pin);
    setChangingPin(false);
    setPinFeedback(true);
    setTimeout(() => setPinFeedback(false), 2500);
  }

  function handleSaveGoal() {
    setDailyGoal(selectedGoal === 0 ? null : selectedGoal);
    setGoalFeedback(true);
    setTimeout(() => setGoalFeedback(false), 2500);
  }

  function handleSaveEmail() {
    const trimmed = emailInput.trim();
    // Validation format
    if (trimmed !== '' && !EMAIL_REGEX.test(trimmed)) {
      setEmailFeedback('error');
      setTimeout(() => setEmailFeedback(null), 3000);
      return;
    }
    const value = trimmed === '' ? null : trimmed;
    setAdminEmail(value);
    // Sync Supabase fire-and-forget (silencieux si hors connexion)
    if (deviceId) syncAdminSettings(deviceId, dailyGoal, value);
    setEmailFeedback('saved');
    setTimeout(() => setEmailFeedback(null), 2500);
  }

  function handleRemoveEmail() {
    setEmailInput('');
    setAdminEmail(null);
    if (deviceId) syncAdminSettings(deviceId, dailyGoal, null);
  }

  function handleReset() {
    resetProgress();
    setConfirmReset(false);
  }

  function handleDelete() {
    deleteProfile();
    // Redirige vers l'onboarding après suppression
    router.replace('/');
  }

  // ── Stats calculées ─────────────────────────────────────────────────────────
  const totalGames  = sessions.length;
  const totalPoints = sessions.reduce((sum, s) => sum + s.score, 0);
  const bestPct     = sessions.length
    ? Math.round(Math.max(...sessions.map((s) => s.score / s.totalQuestions)) * 100)
    : null;

  // ── Modal PIN (création ou vérification) ────────────────────────────────────
  if (access === 'pin-modal') {
    return (
      <PinModal
        mode={adminPin === null ? 'create' : 'verify'}
        storedPin={adminPin}
        onSuccess={handlePinSuccess}
        onCancel={() => router.push('/profile')}
      />
    );
  }

  // ── Dashboard parent ─────────────────────────────────────────────────────────
  return (
    <div className="admin">

      {/* Modal modification de PIN (par-dessus le dashboard) */}
      {changingPin && (
        <PinModal
          mode="create"
          onSuccess={handleChangePinSuccess}
          onCancel={() => setChangingPin(false)}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="admin__header">
        <button
          type="button"
          className="admin__back-btn"
          onClick={() => router.push('/profile')}
          aria-label={t('ctaBack')}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="admin__title">{t('title')}</h1>
        <div className="admin__header-spacer" aria-hidden="true" />
      </header>

      <main className="admin__body">

        {/* ── Stats enfant (lecture seule) ────────────────────────────────── */}
        <section className="admin__section" aria-labelledby="admin-stats-title">
          <div className="admin__section-header">
            <BarChart3 size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-stats-title" className="admin__section-title">
              {t('statsTitle', { pseudo: profile?.pseudo ?? '' })}
            </h2>
          </div>

          {totalGames === 0 ? (
            <p className="admin__empty">{t('statsNoSession')}</p>
          ) : (
            <div className="admin__stats-grid">
              <div className="admin__stat-card">
                <span className="admin__stat-value">{totalGames}</span>
                <span className="admin__stat-label">{t('statsTotalGames')}</span>
              </div>
              <div className="admin__stat-card">
                <span className="admin__stat-value">{totalPoints}</span>
                <span className="admin__stat-label">{t('statsTotalPoints')}</span>
              </div>
              <div className="admin__stat-card">
                <span className="admin__stat-value">
                  {bestPct !== null ? `${bestPct}%` : '—'}
                </span>
                <span className="admin__stat-label">{t('statsBestScore')}</span>
              </div>
            </div>
          )}
        </section>

        {/* ── Objectif journalier ─────────────────────────────────────────── */}
        <section className="admin__section" aria-labelledby="admin-goal-title">
          <div className="admin__section-header">
            <Target size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-goal-title" className="admin__section-title">{t('goalTitle')}</h2>
          </div>
          <p className="admin__section-desc">{t('goalDesc')}</p>

          {/* Sélecteur d'objectif */}
          <div className="admin__goal-options" role="group" aria-label={t('goalTitle')}>
            {GOAL_OPTIONS.map((val) => (
              <button
                key={val}
                type="button"
                className={`admin__goal-btn${selectedGoal === val ? ' admin__goal-btn--active' : ''}`}
                onClick={() => setSelectedGoal(val)}
                aria-pressed={selectedGoal === val}
              >
                {val === 0 ? t('goalDisabled') : val}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="admin__save-btn"
            onClick={handleSaveGoal}
          >
            {goalFeedback ? t('goalSaved') : t('goalSave')}
          </button>
        </section>

        {/* ── Code parent ─────────────────────────────────────────────────── */}
        <section className="admin__section" aria-labelledby="admin-pin-title">
          <div className="admin__section-header">
            <KeyRound size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-pin-title" className="admin__section-title">{t('pinTitle')}</h2>
          </div>
          <p className="admin__section-desc">{t('pinChangeDesc')}</p>

          {pinFeedback && (
            <p className="admin__feedback admin__feedback--success">{t('pinChanged')}</p>
          )}

          <button
            type="button"
            className="admin__secondary-btn"
            onClick={() => setChangingPin(true)}
          >
            {t('pinChange')}
          </button>
        </section>

        {/* ── Email de contact ────────────────────────────────────────────── */}
        <section className="admin__section" aria-labelledby="admin-email-title">
          <div className="admin__section-header">
            <Mail size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-email-title" className="admin__section-title">{t('emailTitle')}</h2>
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
              onClick={handleSaveEmail}
            >
              {emailFeedback === 'saved' ? t('emailSaved') : t('emailSave')}
            </button>
          </div>

          {emailFeedback === 'error' && (
            <p className="admin__feedback admin__feedback--error">{t('emailInvalid')}</p>
          )}

          {/* Bouton supprimer l'email — visible uniquement si un email est enregistré */}
          {adminEmail && (
            <button
              type="button"
              className="admin__email-remove"
              onClick={handleRemoveEmail}
            >
              {t('emailRemove')}
            </button>
          )}
        </section>

        {/* ── Zone de danger ───────────────────────────────────────────────── */}
        <section className="admin__section admin__section--danger" aria-labelledby="admin-danger-title">
          <div className="admin__section-header">
            <Trash2 size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-danger-title" className="admin__section-title">{t('dangerTitle')}</h2>
          </div>

          {/* Reset progression */}
          <div className="admin__danger-item">
            <div className="admin__danger-info">
              <p className="admin__danger-label">{t('dangerResetLabel')}</p>
              <p className="admin__danger-desc">{t('dangerResetDesc')}</p>
            </div>

            {!confirmReset ? (
              <button
                type="button"
                className="admin__danger-btn admin__danger-btn--warning"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw size={16} strokeWidth={2} />
                {t('dangerResetLabel')}
              </button>
            ) : (
              // Double confirmation pour éviter les clics accidentels
              <div className="admin__danger-confirm">
                <p className="admin__danger-confirm-msg">Êtes-vous sûr ?</p>
                <div className="admin__danger-confirm-actions">
                  <button
                    type="button"
                    className="admin__danger-btn admin__danger-btn--cancel"
                    onClick={() => setConfirmReset(false)}
                  >
                    {t('dangerResetCancel')}
                  </button>
                  <button
                    type="button"
                    className="admin__danger-btn admin__danger-btn--destructive"
                    onClick={handleReset}
                  >
                    {t('dangerResetConfirm')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Supprimer le compte */}
          <div className="admin__danger-item">
            <div className="admin__danger-info">
              <p className="admin__danger-label">{t('dangerDeleteLabel')}</p>
              <p className="admin__danger-desc">{t('dangerDeleteDesc')}</p>
            </div>

            {!confirmDelete ? (
              <button
                type="button"
                className="admin__danger-btn admin__danger-btn--destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} strokeWidth={2} />
                {t('dangerDeleteLabel')}
              </button>
            ) : (
              <div className="admin__danger-confirm">
                <p className="admin__danger-confirm-msg">Êtes-vous sûr ? Cette action est irréversible.</p>
                <div className="admin__danger-confirm-actions">
                  <button
                    type="button"
                    className="admin__danger-btn admin__danger-btn--cancel"
                    onClick={() => setConfirmDelete(false)}
                  >
                    {t('dangerDeleteCancel')}
                  </button>
                  <button
                    type="button"
                    className="admin__danger-btn admin__danger-btn--destructive"
                    onClick={handleDelete}
                  >
                    {t('dangerDeleteConfirm')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
