/**
 * src/lib/difficulty.ts
 *
 * Progression de difficulté par catégorie (cahier-des-charges-claude-v1.4.md §3).
 * Entièrement dérivé de l'historique des sessions (profileStore.sessions) —
 * aucun état persisté séparé, aucune migration de schéma nécessaire.
 *
 * Règles :
 *   Facile → Moyen    : score ≥ 80% sur 3 parties consécutives en Facile, dans la catégorie.
 *   Moyen  → Difficile : score ≥ 90% sur 3 parties consécutives en Moyen, dans la catégorie.
 *   Rétrogradation      : score < 40% sur 2 parties consécutives en Moyen ou Difficile.
 *
 * Déblocage = cliquet permanent : une fois la condition atteinte une fois dans
 * l'historique, le niveau reste débloqué même si les parties suivantes sont moins bonnes.
 * La rétrogradation est l'inverse — une suggestion réévaluée à chaque partie,
 * jamais un état mémorisé (l'enfant peut toujours rejouer au niveau du dessus).
 */

import type { Category, Difficulty, QuizSession } from '@/types';

const PROMOTION_STREAK = 3;
const DEMOTION_STREAK = 2;
const MEDIUM_THRESHOLD = 0.8;
const HARD_THRESHOLD = 0.9;
const DEMOTION_THRESHOLD = 0.4;

/** Sessions d'une catégorie+difficulté, de la plus ancienne à la plus récente. */
function sessionsFor(sessions: QuizSession[], category: Category, difficulty: Difficulty): QuizSession[] {
  return sessions
    .filter((s) => s.category === category && s.difficulty === difficulty)
    .sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime());
}

function scoreRatio(s: QuizSession): number {
  return s.totalQuestions > 0 ? s.score / s.totalQuestions : 0;
}

/**
 * true si, à un moment quelconque de la liste (déjà triée), `streakLen` parties
 * consécutives ont toutes atteint `threshold`. Balaie toutes les fenêtres possibles,
 * pas seulement les `streakLen` dernières — le déblocage ne se reprend jamais.
 */
function hasEverStreak(chronological: QuizSession[], threshold: number, streakLen: number): boolean {
  for (let i = 0; i + streakLen <= chronological.length; i++) {
    if (chronological.slice(i, i + streakLen).every((s) => scoreRatio(s) >= threshold)) return true;
  }
  return false;
}

/** Le niveau Moyen est-il débloqué pour cette catégorie ? */
export function isMediumUnlocked(sessions: QuizSession[], category: Category): boolean {
  return hasEverStreak(sessionsFor(sessions, category, 'easy'), MEDIUM_THRESHOLD, PROMOTION_STREAK);
}

/** Le niveau Difficile est-il débloqué pour cette catégorie ? */
export function isHardUnlocked(sessions: QuizSession[], category: Category): boolean {
  if (!isMediumUnlocked(sessions, category)) return false;
  return hasEverStreak(sessionsFor(sessions, category, 'medium'), HARD_THRESHOLD, PROMOTION_STREAK);
}

/** Un niveau donné est-il jouable pour cette catégorie ? */
export function isDifficultyUnlocked(sessions: QuizSession[], category: Category, difficulty: Difficulty): boolean {
  if (difficulty === 'easy') return true;
  if (difficulty === 'medium') return isMediumUnlocked(sessions, category);
  return isHardUnlocked(sessions, category);
}

/** Liste des niveaux jouables pour cette catégorie, dans l'ordre Facile → Difficile. */
export function getUnlockedDifficulties(sessions: QuizSession[], category: Category): Difficulty[] {
  const result: Difficulty[] = ['easy'];
  if (isMediumUnlocked(sessions, category)) result.push('medium');
  if (isHardUnlocked(sessions, category)) result.push('hard');
  return result;
}

/**
 * Le niveau `target` vient-il d'être débloqué par la dernière partie de `sessions`
 * (le tableau inclut déjà la session qui vient de se terminer) ?
 * Sert à ne célébrer le déblocage qu'une seule fois, au moment où il se produit.
 */
export function justUnlockedDifficulty(
  sessions: QuizSession[],
  category: Category,
  target: 'medium' | 'hard'
): boolean {
  if (sessions.length === 0) return false;
  const before = sessions.slice(0, -1);
  const check = target === 'medium' ? isMediumUnlocked : isHardUnlocked;
  return !check(before, category) && check(sessions, category);
}

/**
 * Faut-il suggérer de rétrograder après cette partie ? Réévalué à chaque partie
 * à partir des 2 dernières de ce niveau dans cette catégorie — pas un refus mémorisé.
 */
export function shouldSuggestDemotion(sessions: QuizSession[], category: Category, difficulty: Difficulty): boolean {
  if (difficulty === 'easy') return false;
  const last2 = sessionsFor(sessions, category, difficulty).slice(-DEMOTION_STREAK);
  if (last2.length < DEMOTION_STREAK) return false;
  return last2.every((s) => scoreRatio(s) < DEMOTION_THRESHOLD);
}

/** Niveau immédiatement inférieur — pour appliquer une rétrogradation acceptée. */
export function lowerDifficulty(difficulty: Difficulty): Difficulty {
  return difficulty === 'hard' ? 'medium' : 'easy';
}
