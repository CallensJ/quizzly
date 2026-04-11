/**
 * src/lib/auth.ts
 *
 * Fonctions d'authentification Supabase Auth pour Quizzly.
 * Utilisé exclusivement par les adultes (parents / enseignants).
 *
 * Providers supportés :
 *   - Email + mot de passe (signUp / signIn)
 *   - Google OAuth (signInWithGoogle)
 *
 * Pattern : chaque fonction retourne { error } pour laisser
 * le composant gérer l'affichage des erreurs.
 */

import { supabase } from './supabase';

// URL de base pour les redirects OAuth — utilise la variable d'env si dispo (Vercel)
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

// ─── Email / Password ─────────────────────────────────────────────────────────

/**
 * Création de compte avec email + mot de passe.
 * Supabase envoie un email de confirmation automatiquement.
 */
export async function signUp(email: string, password: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Redirect après confirmation email → callback handler
      emailRedirectTo: `${SITE_URL}/api/auth/callback`,
    },
  });
  return { error };
}

/**
 * Connexion avec email + mot de passe.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

/**
 * Connexion via Google OAuth.
 * Redirige vers Google, puis revient sur /auth/callback avec un code.
 * Le callback échange le code contre une session Supabase.
 *
 * Important : configurer l'URL de redirect dans le dashboard Supabase
 * Authentication → URL Configuration → Redirect URLs :
 *   - http://localhost:3000/api/auth/callback (dev)
 *   - https://app.erudia.app/api/auth/callback (prod)
 *   - https://*.vercel.app/api/auth/callback (preview)
 *
 * La locale est passée en query param pour que le route handler puisse
 * rediriger vers /{locale}/admin après l'échange du code.
 */
export async function signInWithGoogle(locale: string = 'en', next?: string) {
  const nextParam = next ? `&next=${encodeURIComponent(next)}` : '';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${SITE_URL}/api/auth/callback?locale=${locale}${nextParam}`,
      queryParams: {
        // Demande le compte à chaque connexion (évite la connexion auto au compte par défaut)
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { error };
}

// ─── Déconnexion ──────────────────────────────────────────────────────────────

/**
 * Déconnexion — efface la session Supabase (localStorage sb-*).
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// ─── Reset mot de passe ───────────────────────────────────────────────────────

/**
 * Envoie un email de réinitialisation de mot de passe.
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/api/auth/callback?type=recovery`,
  });
  return { error };
}
