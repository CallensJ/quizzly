/**
 * src/lib/mythology.ts
 *
 * Configuration des sous-catégories de Mythologie + logique de déblocage.
 *
 * Hiérarchie :
 *   Mythologie (catégorie parente, premium) → 7 civilisations (sous-catégories)
 *
 * Modèle de déblocage :
 *   - 'greco-roman' : GRATUITE — accessible sans abonnement (aperçu freemium)
 *   - Les autres : nécessitent un abonnement Premium ET d'avoir accumulé
 *     suffisamment de bonnes réponses (toutes catégories confondues)
 *
 * Les critères sont intentionnellement basés sur des métriques déjà trackées
 * (totalCorrect, totalSessions) pour ne pas nécessiter de nouveau stockage.
 */

import type { MythSubcategory, QuizSession } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UnlockCriteria {
  /** Nombre total de bonnes réponses requises (toutes catégories confondues) */
  totalCorrect: number;
  /** Nombre total de parties requises (critère alternatif — OR) */
  totalSessions: number;
}

export interface MythSubcategoryConfig {
  id: MythSubcategory;
  /** Clé i18n dans le namespace 'home' */
  i18nKey: string;
  /** Couleur hex de la sous-catégorie */
  color: string;
  /** Gratuit : accessible sans abonnement (uniquement 'greco-roman') */
  free: boolean;
  /** Des questions sont disponibles en base (false = bientôt disponible) */
  available: boolean;
  /** null si gratuit, sinon les seuils à atteindre (l'un OU l'autre suffit) */
  unlock: UnlockCriteria | null;
}

// ── Configuration des sous-catégories ─────────────────────────────────────

export const MYTH_SUBCATEGORIES: MythSubcategoryConfig[] = [
  {
    id: 'greco-roman',
    i18nKey: 'mythGrecoRoman',
    color: '#9C27B0',
    free: true,
    available: false,       // TODO : questions à créer
    unlock: null,           // gratuit — aucun critère
  },
  {
    id: 'egypt',
    i18nKey: 'mythEgypt',
    color: '#F57C00',
    free: false,
    available: true,        // mythologie-egypt.json existe
    unlock: { totalCorrect: 50, totalSessions: 10 },
  },
  {
    id: 'nordic',
    i18nKey: 'mythNordic',
    color: '#1565C0',
    free: false,
    available: false,
    unlock: { totalCorrect: 150, totalSessions: 30 },
  },
  {
    id: 'celtic',
    i18nKey: 'mythCeltic',
    color: '#2E7D32',
    free: false,
    available: false,
    unlock: { totalCorrect: 300, totalSessions: 60 },
  },
  {
    id: 'amerindian',
    i18nKey: 'mythAmerindian',
    color: '#BF360C',
    free: false,
    available: false,
    unlock: { totalCorrect: 500, totalSessions: 100 },
  },
  {
    id: 'asian',
    i18nKey: 'mythAsian',
    color: '#C62828',
    free: false,
    available: false,
    unlock: { totalCorrect: 750, totalSessions: 150 },
  },
  {
    id: 'african',
    i18nKey: 'mythAfrican',
    color: '#6A1B9A',
    free: false,
    available: false,
    unlock: { totalCorrect: 1000, totalSessions: 200 },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Calcule le total de bonnes réponses et de parties depuis les sessions. */
function getStats(sessions: QuizSession[]): { totalCorrect: number; totalSessions: number } {
  return {
    totalCorrect: sessions.reduce((acc, s) => acc + s.score, 0),
    totalSessions: sessions.length,
  };
}

/**
 * Retourne l'ensemble des MythSubcategory débloquées pour un joueur donné.
 * @param sessions  Historique complet du joueur
 * @param isPremium Le joueur a-t-il un abonnement actif ?
 */
export function getUnlockedMythSubcategories(
  sessions: QuizSession[],
  isPremium: boolean
): Set<MythSubcategory> {
  const unlocked = new Set<MythSubcategory>();
  const { totalCorrect, totalSessions } = getStats(sessions);

  for (const sub of MYTH_SUBCATEGORIES) {
    if (sub.free) {
      // Gratuit = toujours débloqué (pas besoin de premium)
      unlocked.add(sub.id);
      continue;
    }
    // Non gratuit : premium requis + critères atteints
    if (!isPremium) continue;
    if (!sub.unlock) {
      unlocked.add(sub.id);
      continue;
    }
    // L'un OU l'autre des critères suffit
    if (
      totalCorrect >= sub.unlock.totalCorrect ||
      totalSessions >= sub.unlock.totalSessions
    ) {
      unlocked.add(sub.id);
    }
  }

  return unlocked;
}

/**
 * Retourne la progression vers le déblocage d'une sous-catégorie.
 * Retourne le critère le plus proche d'être atteint.
 *
 * @returns { current, required, type } ou null si déjà débloqué / gratuit
 */
export function getMythUnlockProgress(
  sessions: QuizSession[],
  subcategory: MythSubcategory
): { current: number; required: number; type: 'correct' | 'sessions' } | null {
  const config = MYTH_SUBCATEGORIES.find((s) => s.id === subcategory);
  if (!config || !config.unlock) return null;

  const { totalCorrect, totalSessions } = getStats(sessions);
  const { unlock } = config;

  // On affiche le critère le plus proche d'être atteint (progression max)
  const pctCorrect  = totalCorrect  / unlock.totalCorrect;
  const pctSessions = totalSessions / unlock.totalSessions;

  if (pctCorrect >= pctSessions) {
    return { current: totalCorrect,  required: unlock.totalCorrect,  type: 'correct' };
  }
  return   { current: totalSessions, required: unlock.totalSessions, type: 'sessions' };
}
