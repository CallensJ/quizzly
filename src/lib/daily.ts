/**
 * src/lib/daily.ts
 *
 * Logique du mode Défi Quotidien.
 *
 * Principe : un seed basé sur la date du jour génère le même quiz pour tous les joueurs.
 * Pas de table Supabase supplémentaire — état persisté dans le profileStore (localStorage).
 *
 * Exports :
 *   - getDailyDateString()       → "YYYY-MM-DD" pour aujourd'hui
 *   - getDailyCategoryIndex()    → 0|1|2 (cycle sur les 3 catégories gratuites)
 *   - getDailyQuestions()        → 20 questions dans l'ordre déterministe du jour
 *   - calculateDailyXp()         → XP gagné pour une complétion
 *   - getTitleForXp()            → titre débloqué selon le total XP
 *   - TITLES                     → liste ordonnée des paliers de titre
 */

import type { Question, Category } from '@/types';

// Catégories disponibles en free tier — cycle quotidien
const FREE_CATEGORIES: Category[] = ['sciences', 'histoire', 'heroes'];

/**
 * Renvoie la date du jour au format ISO YYYY-MM-DD.
 * Utilisée comme seed pour la génération des questions.
 */
export function getDailyDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Retourne l'index (0-2) de la catégorie du jour.
 * Cycle basé sur le numéro de jour dans l'année pour une rotation régulière.
 */
export function getDailyCategoryIndex(date: Date = new Date()): number {
  // Numéro de jour dans l'année (1-366)
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return dayOfYear % FREE_CATEGORIES.length;
}

/** Retourne la catégorie jouée aujourd'hui. */
export function getDailyCategory(date: Date = new Date()): Category {
  return FREE_CATEGORIES[getDailyCategoryIndex(date)];
}

/**
 * Générateur de nombres pseudo-aléatoires déterministe basé sur une chaîne seed.
 * Algorithme : hash de la chaîne → suite xorshift.
 * Même seed → même séquence garantie.
 */
function seededRandom(seed: string): () => number {
  // Hash FNV-1a simplifié pour obtenir un entier 32 bits à partir du seed
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    s ^= seed.charCodeAt(i);
    s = Math.imul(s, 16777619);
    s >>>= 0; // force unsigned 32-bit
  }
  // xorshift32 pour générer la suite
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x100000000;
  };
}

/**
 * Sélectionne et ordonne 20 questions depuis le pool de manière déterministe.
 * Tous les joueurs du même jour verront exactement les mêmes questions dans le même ordre.
 */
export function getDailyQuestions(pool: Question[], date: Date = new Date()): Question[] {
  const dateStr = getDailyDateString(date);
  const rng = seededRandom(dateStr);

  // Fisher-Yates avec RNG seedé
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 20);
}

/**
 * Retourne la difficulté du défi quotidien.
 * Fixée à 'medium' — la tranche d'âge a été supprimée (app ciblée 6-11 ans).
 */
export function getDailyDifficulty(): 'medium' {
  return 'medium';
}

// ── Système XP ───────────────────────────────────────────────────────────────

/** XP de base pour compléter le défi quotidien. */
export const BASE_XP = 100;
/** XP bonus par jour de streak consécutif (plafonné à MAX_STREAK_BONUS). */
export const STREAK_XP_PER_DAY = 10;
/** Plafond du bonus streak (100 XP = 10 jours de streak). */
export const MAX_STREAK_BONUS = 100;
/** Bonus XP pour un score parfait (20/20). */
export const PERFECT_BONUS_XP = 50;
/** Nombre de jours de streak avant de gagner un bouclier. */
export const SHIELD_EVERY_N_DAYS = 7;
/** Nombre maximum de boucliers stockés. */
export const MAX_SHIELDS = 2;

/**
 * Calcule les XP gagnés pour une complétion du défi quotidien.
 * @param streak - Le nouveau streak (après mise à jour)
 * @param score - Score obtenu
 * @param total - Nombre de questions (20)
 */
export function calculateDailyXp(streak: number, score: number, total: number): number {
  const streakBonus = Math.min(streak * STREAK_XP_PER_DAY, MAX_STREAK_BONUS);
  const perfectBonus = score === total ? PERFECT_BONUS_XP : 0;
  return BASE_XP + streakBonus + perfectBonus;
}

// ── Système de titres ─────────────────────────────────────────────────────────

export interface TitleDefinition {
  id: string;
  minXp: number;
  emoji: string;
}

/**
 * Paliers de titres — du plus faible au plus fort.
 * Clés i18n : `daily.title_{id}`
 */
export const TITLES: TitleDefinition[] = [
  { id: 'apprenti', minXp: 0,    emoji: '📖' },
  { id: 'erudit',   minXp: 100,  emoji: '🎓' },
  { id: 'sage',     minXp: 500,  emoji: '🦉' },
  { id: 'maitre',   minXp: 1000, emoji: '⚡' },
  { id: 'legende',  minXp: 2500, emoji: '👑' },
];

/** Retourne le titre correspondant au total XP actuel. */
export function getTitleForXp(xp: number): TitleDefinition {
  // Parcours du plus élevé au plus bas — retourne le premier palier franchi
  return [...TITLES].reverse().find((t) => xp >= t.minXp) ?? TITLES[0];
}
