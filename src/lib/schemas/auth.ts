/**
 * src/lib/schemas/auth.ts
 *
 * Schémas Zod pour la validation des formulaires d'authentification.
 * Utilisés côté client (AuthScreen, AdminScreen) pour valider avant envoi.
 *
 * Note : l'email est normalisé (.toLowerCase().trim()) avant validation
 * dans les composants — les schémas reçoivent donc une valeur déjà propre.
 */

import { z } from 'zod';

/** Connexion — validation légère : email valide + mot de passe non vide */
export const SignInSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

/**
 * Inscription — validation stricte :
 *   - Email valide
 *   - Mot de passe : 8 chars min, 72 max (limite bcrypt Supabase), 1 majuscule, 1 chiffre
 */
export const SignUpSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .max(72, 'Maximum 72 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
});

/** Email adulte (AdminScreen) — email valide ou vide (champ optionnel) */
export const AdminEmailSchema = z.object({
  email: z.string().email('Adresse email invalide'),
});

export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
