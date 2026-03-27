'use client';

/**
 * src/components/features/admin/AdminScreen.tsx
 *
 * Espace parent/enseignant — accès protégé par Supabase Auth (MVP 3+).
 * Le PIN 4 chiffres (MVP 2) a été remplacé par l'authentification Supabase,
 * plus robuste et nécessaire pour les fonctionnalités premium (MVP 4).
 *
 * Flux d'accès :
 *   - Non connecté → redirect vers /auth/login (géré dans admin/page.tsx)
 *   - Connecté → tableau de bord parent affiché directement
 *
 * Fonctionnalités :
 *   - Stats enfant en lecture seule
 *   - Objectif journalier (bonnes réponses)
 *   - Email de contact adulte
 *   - Rapport de progression PDF (téléchargement + envoi email + planification auto)
 *   - Mode Défi (multijoueur asynchrone)
 *   - Déconnexion
 *   - Remettre la progression à zéro (irréversible)
 *   - Supprimer le compte (irréversible)
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Target, Trash2, RotateCcw, BarChart3, Mail, LogOut, Swords, Users, UserPlus, Check, TrendingUp } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { syncAdminSettings } from '@/lib/sync';
import { signOut } from '@/lib/auth';
import { buildAvatarUrl } from '@/lib/avatars';
import type { AvatarStyle } from '@/lib/avatars';
import ReportSection from './ReportSection';
import GoalsSection from './GoalsSection';

// Validation basique d'une adresse email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valeurs possibles pour l'objectif journalier (0 = désactivé)
const GOAL_OPTIONS = [0, 5, 10, 15, 20, 30];

export default function AdminScreen() {
  const t = useTranslations('admin');
  const router = useRouter();

  const profile            = useProfileStore((s) => s.profile);
  const sessions           = useProfileStore((s) => s.sessions);
  const deviceId           = useProfileStore((s) => s.deviceId);
  const adminEmail         = useProfileStore((s) => s.adminEmail);
  const dailyGoal          = useProfileStore((s) => s.dailyGoal);
  const profiles           = useProfileStore((s) => s.profiles);
  const activeProfileId    = useProfileStore((s) => s.activeProfileId);
  const switchProfile      = useProfileStore((s) => s.switchProfile);
  const removeChildProfile = useProfileStore((s) => s.removeChildProfile);

  // Auth Supabase — utilisateur connecté
  const authUser = useAuthStore((s) => s.user);

  const multiplayerUnlocked    = useProfileStore((s) => s.multiplayerUnlocked);
  const setMultiplayerUnlocked = useProfileStore((s) => s.setMultiplayerUnlocked);

  const setAdminEmail = useProfileStore((s) => s.setAdminEmail);
  const setDailyGoal  = useProfileStore((s) => s.setDailyGoal);
  const resetProgress = useProfileStore((s) => s.resetProgress);
  const deleteProfile = useProfileStore((s) => s.deleteProfile);

  // ── État UI ─────────────────────────────────────────────────────────────────
  const [confirmReset, setConfirmReset]       = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(false);
  const [deleteChildId, setDeleteChildId]     = useState<string | null>(null);
  const [goalFeedback, setGoalFeedback]   = useState(false);
  const [selectedGoal, setSelectedGoal]   = useState<number>(dailyGoal ?? 0);

  const [emailInput, setEmailInput]       = useState<string>(adminEmail ?? '');
  const [emailFeedback, setEmailFeedback] = useState<'saved' | 'error' | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSaveGoal() {
    setDailyGoal(selectedGoal === 0 ? null : selectedGoal);
    setGoalFeedback(true);
    setTimeout(() => setGoalFeedback(false), 2500);
  }

  function handleSaveEmail() {
    const trimmed = emailInput.trim();
    if (trimmed !== '' && !EMAIL_REGEX.test(trimmed)) {
      setEmailFeedback('error');
      setTimeout(() => setEmailFeedback(null), 3000);
      return;
    }
    const value = trimmed === '' ? null : trimmed;
    setAdminEmail(value);
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
    router.replace('/');
  }

  function handleDeleteChild(id: string) {
    removeChildProfile(id);
    setDeleteChildId(null);
    // Si plus aucun profil → retour à l'onboarding
    const remaining = useProfileStore.getState().profiles;
    if (remaining.length === 0) {
      router.replace('/');
    }
  }

  function handleSwitchProfile(id: string) {
    switchProfile(id);
    router.replace('/home');
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/profile');
  }

  // ── Stats calculées ─────────────────────────────────────────────────────────
  const totalGames  = sessions.length;
  const totalPoints = sessions.reduce((sum, s) => sum + s.score, 0);
  const bestPct     = sessions.length
    ? Math.round(Math.max(...sessions.map((s) => s.score / s.totalQuestions)) * 100)
    : null;

  // ── Dashboard parent ─────────────────────────────────────────────────────────
  return (
    <div className="admin">

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

        {/* Déconnexion dans le header */}
        <button
          type="button"
          className="admin__signout-btn"
          onClick={handleSignOut}
          aria-label={t('authSignOut')}
          title={authUser?.email ?? ''}
        >
          <LogOut size={18} strokeWidth={2} />
        </button>
      </header>

      <main className="admin__body">

        {/* ── Stats enfant (lecture seule) ────────────────────────────────── */}
        <section className="admin__section admin__section--stats" aria-labelledby="admin-stats-title">
          <div className="admin__section-header">
            <BarChart3 size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-stats-title" className="admin__section-title">
              {t('statsTitle', { pseudo: profile?.pseudo ?? '' })}
            </h2>
          </div>

          {/* Accès dashboard avancé */}
          <button
            type="button"
            className="admin__dashboard-btn"
            onClick={() => router.push('/dashboard')}
          >
            <TrendingUp size={16} strokeWidth={2} />
            Voir la progression dans le temps
          </button>

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
        <section className="admin__section admin__section--goal" aria-labelledby="admin-goal-title">
          <div className="admin__section-header">
            <Target size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-goal-title" className="admin__section-title">{t('goalTitle')}</h2>
          </div>
          <p className="admin__section-desc">{t('goalDesc')}</p>

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

        {/* ── Objectifs par catégorie ─────────────────────────────────────── */}
        <GoalsSection />

        {/* ── Email de contact ────────────────────────────────────────────── */}
        <section className="admin__section admin__section--email" aria-labelledby="admin-email-title">
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

        {/* ── Rapport de progression PDF ───────────────────────────────────── */}
        <ReportSection />

        {/* ── Mode Défi (multijoueur) ──────────────────────────────────────── */}
        <section className="admin__section admin__section--multiplayer" aria-labelledby="admin-multiplayer-title">
          <div className="admin__section-header">
            <Swords size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-multiplayer-title" className="admin__section-title">
              {t('multiplayerTitle')}
            </h2>
          </div>
          <p className="admin__section-desc">{t('multiplayerDesc')}</p>

          <div className="admin__toggle-row">
            <span className="admin__toggle-label">
              {multiplayerUnlocked ? t('multiplayerEnabled') : t('multiplayerDisabled')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={multiplayerUnlocked}
              className={`admin__toggle${multiplayerUnlocked ? ' admin__toggle--on' : ''}`}
              onClick={() => setMultiplayerUnlocked(!multiplayerUnlocked)}
            >
              <span className="admin__toggle-thumb" />
            </button>
          </div>
        </section>

        {/* ── Gestion des profils enfants ──────────────────────────────────── */}
        <section className="admin__section admin__section--profiles" aria-labelledby="admin-profiles-title">
          <div className="admin__section-header">
            <Users size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-profiles-title" className="admin__section-title">
              Profils enfants
            </h2>
          </div>
          <p className="admin__section-desc">
            Gérez les profils de vos enfants. Chaque enfant a ses propres scores et badges.
          </p>

          {/* Liste des profils */}
          <div className="admin__profiles-list">
            {profiles.map((p) => (
              <div key={p.id} className="admin__profile-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="admin__profile-avatar"
                  src={buildAvatarUrl(p.avatarId, (p.avatarStyle as AvatarStyle) ?? 'adventurer')}
                  alt=""
                  width={40}
                  height={40}
                />
                <span className="admin__profile-pseudo">{p.pseudo}</span>
                {p.id === activeProfileId && (
                  <span className="admin__profile-active">
                    <Check size={12} aria-hidden="true" />
                    Actif
                  </span>
                )}
                <div className="admin__profile-actions">
                  {p.id !== activeProfileId && (
                    <button
                      type="button"
                      className="admin__profile-switch"
                      onClick={() => handleSwitchProfile(p.id)}
                    >
                      Jouer
                    </button>
                  )}
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      className="admin__profile-delete"
                      onClick={() => setDeleteChildId(p.id)}
                      aria-label={`Supprimer ${p.pseudo}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Ajouter un enfant */}
          <button
            type="button"
            className="admin__profiles-add-btn"
            onClick={() => router.push('/profiles')}
          >
            <UserPlus size={16} strokeWidth={2} />
            Ajouter un enfant
          </button>

          {/* Confirmation suppression profil enfant */}
          {deleteChildId && (
            <div className="admin__danger-confirm" style={{ marginTop: '1rem' }}>
              <p className="admin__danger-confirm-msg">
                Supprimer le profil de «&nbsp;{profiles.find((p) => p.id === deleteChildId)?.pseudo}&nbsp;» ?
                Toute la progression sera perdue.
              </p>
              <div className="admin__danger-confirm-actions">
                <button
                  type="button"
                  className="admin__danger-btn admin__danger-btn--cancel"
                  onClick={() => setDeleteChildId(null)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="admin__danger-btn admin__danger-btn--destructive"
                  onClick={() => handleDeleteChild(deleteChildId)}
                >
                  Supprimer
                </button>
              </div>
            </div>
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
