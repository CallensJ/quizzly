'use client';

/**
 * src/components/features/auth/AuthScreen.tsx
 *
 * Écran d'authentification adulte — login / inscription.
 * Accessible depuis l'espace parent (AdminScreen → bouton "Créer un compte").
 *
 * Fonctionnalités :
 *   - Onglets Login / Inscription
 *   - Email + mot de passe
 *   - Connexion Google OAuth (redirect vers /auth/callback)
 *   - Lien "Mot de passe oublié" avec reset par email
 *   - Messages d'erreur localisés
 *
 * Cible : adultes uniquement. Les enfants n'ont pas de compte.
 */

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Chrome } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { signIn, signUp, signInWithGoogle, resetPassword } from '@/lib/auth';
import { SignInSchema, SignUpSchema } from '@/lib/schemas/auth';
import { getSafeRedirect } from '@/lib/safeRedirect';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const t            = useTranslations('auth');
  const router       = useRouter();
  const locale       = useLocale();
  const searchParams = useSearchParams();

  // Paramètre ?next= injecté par le middleware pour rediriger après connexion
  // getSafeRedirect() valide que l'URL est interne avant de l'utiliser
  const nextUrl = getSafeRedirect(searchParams.get('next'), '/admin');

  const [mode, setMode]               = useState<AuthMode>('login');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  // 'idle' | 'sent' — pour le mot de passe oublié
  const [resetSent, setResetSent]         = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showReset, setShowReset]         = useState(false);

  // ── Soumission du formulaire ───────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Normalisation : lowercase + trim avant validation et envoi à Supabase
    const normalizedEmail = email.toLowerCase().trim();

    // Validation Zod avant appel réseau
    const schema = mode === 'login' ? SignInSchema : SignUpSchema;
    const validation = schema.safeParse({ email: normalizedEmail, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error: authError } = mode === 'login'
      ? await signIn(normalizedEmail, password)
      : await signUp(normalizedEmail, password);

    setLoading(false);

    if (authError) {
      setError(mapError(authError.message));
      return;
    }

    if (mode === 'register') {
      // Inscription réussie → email de confirmation envoyé par Supabase
      // L'utilisateur doit confirmer son email avant de pouvoir se connecter
      setMode('login');
      setRegisterSuccess(true);
    } else {
      // Login réussi → redirection vers ?next= validé, ou /admin par défaut
      router.push(nextUrl);
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const { error: authError } = await signInWithGoogle(locale);
    if (authError) {
      setError(mapError(authError.message));
      setLoading(false);
    }
    // Si succès → redirect Google, pas de setLoading(false) nécessaire
  }

  // ── Reset mot de passe ────────────────────────────────────────────────────

  async function handleResetPassword() {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) {
      setError(t('errorEmailRequired'));
      return;
    }
    setError(null);
    setLoading(true);
    const { error: resetError } = await resetPassword(normalizedEmail);
    setLoading(false);
    if (resetError) {
      setError(mapError(resetError.message));
      return;
    }
    setResetSent(true);
    setShowReset(false);
  }

  // ── Mapping erreurs Supabase → messages lisibles ──────────────────────────

  function mapError(msg: string): string {
    if (msg.includes('Invalid login credentials'))  return t('errorInvalidCredentials');
    if (msg.includes('Email not confirmed'))         return t('errorEmailNotConfirmed');
    if (msg.includes('User already registered'))     return t('errorAlreadyRegistered');
    if (msg.includes('Password should be'))          return t('errorPasswordTooShort');
    if (msg.includes('Unable to validate'))          return t('errorInvalidEmail');
    return t('errorGeneric');
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="auth">

      {/* Header */}
      <header className="auth__header">
        <button
          type="button"
          className="auth__back-btn"
          onClick={() => router.push('/admin')}
          aria-label={t('ctaBack')}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="auth__title">{t('title')}</h1>
        <div className="auth__header-spacer" aria-hidden="true" />
      </header>

      <main className="auth__body">

        {/* Onglets login / inscription */}
        <div className="auth__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth__tab${mode === 'login' ? ' auth__tab--active' : ''}`}
            onClick={() => { setMode('login'); setError(null); setResetSent(false); setRegisterSuccess(false); }}
          >
            {t('tabLogin')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth__tab${mode === 'register' ? ' auth__tab--active' : ''}`}
            onClick={() => { setMode('register'); setError(null); setResetSent(false); setRegisterSuccess(false); }}
          >
            {t('tabRegister')}
          </button>
        </div>

        {/* Contexte / description */}
        <p className="auth__desc">
          {mode === 'login' ? t('descLogin') : t('descRegister')}
        </p>

        {/* Message succès inscription — confirmer l'email avant connexion */}
        {registerSuccess && (
          <div className="auth__notice auth__notice--success">
            {t('registerSuccess')}
          </div>
        )}

        {/* Message envoi reset mot de passe */}
        {resetSent && (
          <div className="auth__notice auth__notice--success">
            {t('resetSent')}
          </div>
        )}

        {/* Formulaire email + password */}
        <form className="auth__form" onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div className="auth__field">
            <label className="auth__label" htmlFor="auth-email">
              {t('labelEmail')}
            </label>
            <div className="auth__input-wrap">
              <Mail size={16} className="auth__input-icon" aria-hidden="true" />
              <input
                id="auth-email"
                type="email"
                className="auth__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('placeholderEmail')}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="auth__field">
            <label className="auth__label" htmlFor="auth-password">
              {t('labelPassword')}
            </label>
            <div className="auth__input-wrap">
              <Lock size={16} className="auth__input-icon" aria-hidden="true" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                className="auth__input auth__input--password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('placeholderPassword')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
              <button
                type="button"
                className="auth__toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              >
                {showPassword
                  ? <EyeOff size={16} />
                  : <Eye size={16} />
                }
              </button>
            </div>
          </div>

          {/* Mot de passe oublié (login uniquement) */}
          {mode === 'login' && (
            <div className="auth__forgot">
              {!showReset ? (
                <button
                  type="button"
                  className="auth__forgot-btn"
                  onClick={() => setShowReset(true)}
                >
                  {t('forgotPassword')}
                </button>
              ) : (
                <div className="auth__forgot-reset">
                  <span className="auth__forgot-hint">{t('forgotHint')}</span>
                  <button
                    type="button"
                    className="auth__forgot-send"
                    onClick={handleResetPassword}
                    disabled={loading}
                  >
                    {t('forgotSend')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <p className="auth__error" role="alert">{error}</p>
          )}

          {/* Bouton principal */}
          <button
            type="submit"
            className="auth__submit-btn"
            disabled={loading}
          >
            {loading
              ? t('loading')
              : mode === 'login' ? t('ctaLogin') : t('ctaRegister')
            }
          </button>
        </form>

        {/* Séparateur */}
        <div className="auth__separator" aria-hidden="true">
          <span>{t('or')}</span>
        </div>

        {/* Bouton Google */}
        <button
          type="button"
          className="auth__google-btn"
          onClick={handleGoogle}
          disabled={loading}
        >
          <Chrome size={18} aria-hidden="true" />
          {t('ctaGoogle')}
        </button>

        {/* Note de confidentialité */}
        <p className="auth__privacy">{t('privacyNote')}</p>

      </main>
    </div>
  );
}
