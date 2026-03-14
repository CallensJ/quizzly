/**
 * src/lib/badges.ts
 *
 * Configuration centralisée du système de badges.
 *
 * Chaque badge a un id, un emoji et une condition évaluée sur l'historique
 * des sessions. Les noms et descriptions sont dans les fichiers i18n
 * (clés : badges.{id}_name, badges.{id}_desc).
 *
 * Badges disponibles (11 total) :
 *   Score    : first_game, good_score, expert, perfect
 *   Parties  : games_5, games_20
 *   Catégorie: scientist, historian, hero_fan
 *   Difficulté: brave, hard_expert
 */

import type { QuizSession } from '@/types';

export interface BadgeDefinition {
  id: string;
  emoji: string;
  // Condition évaluée sur l'intégralité de l'historique (sessions inclus la dernière)
  condition: (sessions: QuizSession[]) => boolean;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ── Score ─────────────────────────────────────────────────────────────────
  {
    id: 'first_game',
    emoji: '🎮',
    // Premier badge — déclenché dès la 1ère partie
    condition: (sessions) => sessions.length >= 1,
  },
  {
    id: 'good_score',
    emoji: '🎓',
    // Score ≥ 50% (10/20) en une seule partie
    condition: (sessions) => sessions.some((s) => s.score / s.totalQuestions >= 0.5),
  },
  {
    id: 'expert',
    emoji: '🏆',
    // Score ≥ 75% (15/20) en une seule partie
    condition: (sessions) => sessions.some((s) => s.score / s.totalQuestions >= 0.75),
  },
  {
    id: 'perfect',
    emoji: '💎',
    // Score parfait : 20/20
    condition: (sessions) => sessions.some((s) => s.score === s.totalQuestions),
  },

  // ── Parties jouées ────────────────────────────────────────────────────────
  {
    id: 'games_5',
    emoji: '📚',
    condition: (sessions) => sessions.length >= 5,
  },
  {
    id: 'games_20',
    emoji: '🏃',
    condition: (sessions) => sessions.length >= 20,
  },

  // ── Par catégorie (5 parties dans la même catégorie) ─────────────────────
  {
    id: 'scientist',
    emoji: '🔬',
    condition: (sessions) => sessions.filter((s) => s.category === 'sciences').length >= 5,
  },
  {
    id: 'historian',
    emoji: '📜',
    condition: (sessions) => sessions.filter((s) => s.category === 'histoire').length >= 5,
  },
  {
    id: 'hero_fan',
    emoji: '⚔️',
    condition: (sessions) => sessions.filter((s) => s.category === 'heroes').length >= 5,
  },

  // ── Difficulté ────────────────────────────────────────────────────────────
  {
    id: 'brave',
    emoji: '💪',
    // Avoir joué au moins une partie en mode difficile
    condition: (sessions) => sessions.some((s) => s.difficulty === 'hard'),
  },
  {
    id: 'hard_expert',
    emoji: '⚡',
    // Score ≥ 50% en mode difficile
    condition: (sessions) =>
      sessions.some((s) => s.difficulty === 'hard' && s.score / s.totalQuestions >= 0.5),
  },

  // ── Défi quotidien — streak (MVP 4) ────────────────────────────────────────
  // Ces badges sont attribués manuellement via completeDailyChallenge() dans profileStore.
  // La condition retourne false ici pour éviter un double-award via getNewlyEarnedBadges().
  // Ils sont présents dans BADGE_DEFINITIONS uniquement pour l'affichage dans la grille du profil.
  {
    id: 'streak_3',
    emoji: '🔥',
    condition: () => false,
  },
  {
    id: 'streak_7',
    emoji: '🌟',
    condition: () => false,
  },
  {
    id: 'streak_30',
    emoji: '👑',
    condition: () => false,
  },
];

/**
 * Compare les conditions de tous les badges avec l'historique actuel
 * et retourne les IDs des badges nouvellement débloqués (non encore obtenus).
 */
export function getNewlyEarnedBadges(
  sessions: QuizSession[],
  alreadyEarned: string[]
): string[] {
  return BADGE_DEFINITIONS
    .filter((b) => !alreadyEarned.includes(b.id) && b.condition(sessions))
    .map((b) => b.id);
}
