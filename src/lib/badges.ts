/**
 * src/lib/badges.ts
 *
 * Configuration centralisée du système de badges (50 badges).
 *
 * Chaque badge a un id, un emoji et une condition évaluée sur l'historique
 * des sessions. Les noms et descriptions sont dans les fichiers i18n
 * (clés : badges.{id}_name, badges.{id}_desc).
 *
 * Groupes :
 *   Catégories  : sci_*, hist_*, hero_*, math_*  (4×5 = 20)
 *   Score       : first_game, good_score, great_score, perfect, triple_perfect, perfect_ten (6)
 *   Volume      : games_5, games_20, games_50, games_100, games_200, games_500 (6)
 *   Difficulté  : easy_perfect, brave, hard_half, hard_ace, hard_perfect (5)
 *   Streak      : streak_3, streak_7, streak_14, streak_30, streak_60 (5)
 *   Transversaux: all_rounder, polymath, all_difficulties, all_perfect_cats, knowledge_legend (5)
 *   Méta        : collector_15, collector_30, collector_50 (3)
 *
 * Référence complète : documentations/app/badges.md
 */

import type { Category, QuizSession } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BadgeDefinition {
  id: string;
  emoji: string;
  /**
   * Condition évaluée sur l'intégralité de l'historique.
   * @param sessions — toutes les sessions jouées (inclut la dernière)
   * @param earnedCount — nombre total de badges déjà obtenus (utilisé par les badges méta)
   */
  condition: (sessions: QuizSession[], earnedCount: number) => boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Catégories gratuites actuellement jouables */
const FREE_CATS: Category[] = ['sciences', 'histoire', 'heroes', 'math'];

/** Nombre de parties dans une catégorie donnée */
function catCount(sessions: QuizSession[], cat: Category): number {
  return sessions.filter((s) => s.category === cat).length;
}

/** Nombre de scores parfaits dans une catégorie donnée */
function catPerfects(sessions: QuizSession[], cat: Category): number {
  return sessions.filter((s) => s.category === cat && s.score === s.totalQuestions).length;
}

/** Nombre total de scores parfaits (toutes catégories) */
function totalPerfects(sessions: QuizSession[]): number {
  return sessions.filter((s) => s.score === s.totalQuestions).length;
}

/** Génère les 5 badges d'une catégorie (curious → legend) */
function categoryBadges(prefix: string, cat: Category, emojis: [string, string, string, string, string]): BadgeDefinition[] {
  return [
    { id: `${prefix}_curious`,     emoji: emojis[0], condition: (s) => catCount(s, cat) >= 3 },
    { id: `${prefix}_passionate`,  emoji: emojis[1], condition: (s) => catCount(s, cat) >= 10 },
    { id: `${prefix}_expert`,      emoji: emojis[2], condition: (s) => catCount(s, cat) >= 25 },
    { id: `${prefix}_master`,      emoji: emojis[3], condition: (s) => catPerfects(s, cat) >= 1 },
    { id: `${prefix}_legend`,      emoji: emojis[4], condition: (s) => catCount(s, cat) >= 50 && catPerfects(s, cat) >= 3 },
  ];
}

// ─── Définitions ────────────────────────────────────────────────────────────

export const BADGE_DEFINITIONS: BadgeDefinition[] = [

  // ── 1. Sciences (5) ─────────────────────────────────────────────────────
  ...categoryBadges('sci', 'sciences', ['🔬', '🧪', '🧬', '🔭', '⚛️']),

  // ── 2. Histoire (5) ─────────────────────────────────────────────────────
  ...categoryBadges('hist', 'histoire', ['📜', '🏛️', '📖', '🏺', '👑']),

  // ── 3. Héros (5) ────────────────────────────────────────────────────────
  ...categoryBadges('hero', 'heroes', ['⚔️', '🛡️', '🗡️', '🦸', '🏰']),

  // ── 4. Mathématiques (5) ────────────────────────────────────────────────
  ...categoryBadges('math', 'math', ['🔢', '📐', '📊', '🧮', '♾️']),

  // ── 5. Score global (6) ─────────────────────────────────────────────────
  {
    id: 'first_game',
    emoji: '🎮',
    condition: (s) => s.length >= 1,
  },
  {
    id: 'good_score',
    emoji: '🎓',
    // Score ≥ 50% en une partie
    condition: (s) => s.some((q) => q.score / q.totalQuestions >= 0.5),
  },
  {
    id: 'great_score',
    emoji: '🌟',
    // Score ≥ 75% en une partie
    condition: (s) => s.some((q) => q.score / q.totalQuestions >= 0.75),
  },
  {
    id: 'perfect',
    emoji: '💎',
    condition: (s) => totalPerfects(s) >= 1,
  },
  {
    id: 'triple_perfect',
    emoji: '💫',
    condition: (s) => totalPerfects(s) >= 3,
  },
  {
    id: 'perfect_ten',
    emoji: '🏅',
    condition: (s) => totalPerfects(s) >= 10,
  },

  // ── 6. Volume de parties (6) ────────────────────────────────────────────
  { id: 'games_5',   emoji: '📚', condition: (s) => s.length >= 5 },
  { id: 'games_20',  emoji: '🏃', condition: (s) => s.length >= 20 },
  { id: 'games_50',  emoji: '🎯', condition: (s) => s.length >= 50 },
  { id: 'games_100', emoji: '💯', condition: (s) => s.length >= 100 },
  { id: 'games_200', emoji: '🚀', condition: (s) => s.length >= 200 },
  { id: 'games_500', emoji: '⭐', condition: (s) => s.length >= 500 },

  // ── 7. Difficulté (5) ──────────────────────────────────────────────────
  {
    id: 'easy_perfect',
    emoji: '🌱',
    // Score parfait en mode Facile
    condition: (s) => s.some((q) => q.difficulty === 'easy' && q.score === q.totalQuestions),
  },
  {
    id: 'brave',
    emoji: '💪',
    condition: (s) => s.some((q) => q.difficulty === 'hard'),
  },
  {
    id: 'hard_half',
    emoji: '🔥',
    // Score ≥ 50% en mode Difficile
    condition: (s) => s.some((q) => q.difficulty === 'hard' && q.score / q.totalQuestions >= 0.5),
  },
  {
    id: 'hard_ace',
    emoji: '⚡',
    // Score ≥ 75% en mode Difficile
    condition: (s) => s.some((q) => q.difficulty === 'hard' && q.score / q.totalQuestions >= 0.75),
  },
  {
    id: 'hard_perfect',
    emoji: '🐉',
    // Score parfait en mode Difficile
    condition: (s) => s.some((q) => q.difficulty === 'hard' && q.score === q.totalQuestions),
  },

  // ── 8. Streak — Défi quotidien (5) ─────────────────────────────────────
  // Attribués manuellement via completeDailyChallenge() dans profileStore.
  // Condition () => false pour éviter le double-award via getNewlyEarnedBadges().
  { id: 'streak_3',  emoji: '🔥', condition: () => false },
  { id: 'streak_7',  emoji: '🌟', condition: () => false },
  { id: 'streak_14', emoji: '💪', condition: () => false },
  { id: 'streak_30', emoji: '🏆', condition: () => false },
  { id: 'streak_60', emoji: '👑', condition: () => false },

  // ── 9. Transversaux (5) ────────────────────────────────────────────────
  {
    id: 'all_rounder',
    emoji: '🌍',
    // Au moins 1 partie dans chaque catégorie gratuite
    condition: (s) => FREE_CATS.every((cat) => s.some((q) => q.category === cat)),
  },
  {
    id: 'polymath',
    emoji: '🧠',
    // Au moins 10 parties dans chaque catégorie gratuite
    condition: (s) => FREE_CATS.every((cat) => catCount(s, cat) >= 10),
  },
  {
    id: 'all_difficulties',
    emoji: '🎨',
    // Au moins 1 partie dans chaque difficulté
    condition: (s) =>
      (['easy', 'medium', 'hard'] as const).every((d) => s.some((q) => q.difficulty === d)),
  },
  {
    id: 'all_perfect_cats',
    emoji: '🏆',
    // Au moins 1 score parfait dans chaque catégorie gratuite
    condition: (s) => FREE_CATS.every((cat) => catPerfects(s, cat) >= 1),
  },
  {
    id: 'knowledge_legend',
    emoji: '🌌',
    // 50 parties dans chaque catégorie gratuite + score moyen global ≥ 70%
    condition: (s) => {
      if (!FREE_CATS.every((cat) => catCount(s, cat) >= 50)) return false;
      if (s.length === 0) return false;
      const avg = s.reduce((sum, q) => sum + q.score / q.totalQuestions, 0) / s.length;
      return avg >= 0.7;
    },
  },

  // ── 10. Méta — Collectionneurs (3) ─────────────────────────────────────
  // earnedCount est passé en 2e argument par getNewlyEarnedBadges (2e passe)
  { id: 'collector_15', emoji: '🗃️', condition: (_s, earned) => earned >= 15 },
  { id: 'collector_30', emoji: '🏛️', condition: (_s, earned) => earned >= 30 },
  { id: 'collector_50', emoji: '🌠', condition: (_s, earned) => earned >= 50 },
];

// ─── Groupes de badges ───────────────────────────────────────────────────────
//
// Chaque groupe correspond à une thématique (catégorie, mécanique de jeu…).
// Utilisé par la modale trophées pour afficher les badges par section accordéon.
// Extensible : ajouter un groupe ici suffit pour qu'il apparaisse automatiquement.

export interface BadgeGroup {
  id: string;
  /** Clé i18n dans le namespace "badges" — ex: "groupSciences" */
  labelKey: string;
  /** Emoji représentatif du groupe */
  emoji: string;
  /** Couleur CSS du groupe (barre de progression, accents) */
  color: string;
  /** IDs des badges appartenant à ce groupe, dans l'ordre d'affichage */
  badgeIds: string[];
}

export const BADGE_GROUPS: BadgeGroup[] = [
  {
    id: 'sciences',
    labelKey: 'groupSciences',
    emoji: '🔬',
    color: '#2196F3',
    badgeIds: ['sci_curious', 'sci_passionate', 'sci_expert', 'sci_master', 'sci_legend'],
  },
  {
    id: 'histoire',
    labelKey: 'groupHistoire',
    emoji: '📜',
    color: '#795548',
    badgeIds: ['hist_curious', 'hist_passionate', 'hist_expert', 'hist_master', 'hist_legend'],
  },
  {
    id: 'heroes',
    labelKey: 'groupHeroes',
    emoji: '⚔️',
    color: '#E91E63',
    badgeIds: ['hero_curious', 'hero_passionate', 'hero_expert', 'hero_master', 'hero_legend'],
  },
  {
    id: 'math',
    labelKey: 'groupMath',
    emoji: '🔢',
    color: '#FF5252',
    badgeIds: ['math_curious', 'math_passionate', 'math_expert', 'math_master', 'math_legend'],
  },
  {
    id: 'score',
    labelKey: 'groupScore',
    emoji: '🌟',
    color: '#FFB300',
    badgeIds: ['first_game', 'good_score', 'great_score', 'perfect', 'triple_perfect', 'perfect_ten'],
  },
  {
    id: 'volume',
    labelKey: 'groupVolume',
    emoji: '📚',
    color: '#667eea',
    badgeIds: ['games_5', 'games_20', 'games_50', 'games_100', 'games_200', 'games_500'],
  },
  {
    id: 'difficulte',
    labelKey: 'groupDifficulte',
    emoji: '💪',
    color: '#F44336',
    badgeIds: ['easy_perfect', 'brave', 'hard_half', 'hard_ace', 'hard_perfect'],
  },
  {
    id: 'streak',
    labelKey: 'groupStreak',
    emoji: '🔥',
    color: '#FF9800',
    badgeIds: ['streak_3', 'streak_7', 'streak_14', 'streak_30', 'streak_60'],
  },
  {
    id: 'transversaux',
    labelKey: 'groupTransversaux',
    emoji: '🌍',
    color: '#4CAF50',
    badgeIds: ['all_rounder', 'polymath', 'all_difficulties', 'all_perfect_cats', 'knowledge_legend'],
  },
  {
    id: 'meta',
    labelKey: 'groupMeta',
    emoji: '🏛️',
    color: '#764ba2',
    badgeIds: ['collector_15', 'collector_30', 'collector_50'],
  },
];

// ─── Évaluation ─────────────────────────────────────────────────────────────

/**
 * Compare les conditions de tous les badges avec l'historique actuel
 * et retourne les IDs des badges nouvellement débloqués.
 *
 * Deux passes :
 *   1. Évalue tous les badges sauf les collectionneurs (conditions basées sur sessions)
 *   2. Évalue les collectionneurs avec le compte total mis à jour
 */
export function getNewlyEarnedBadges(
  sessions: QuizSession[],
  alreadyEarned: string[]
): string[] {
  const newBadges: string[] = [];

  // Passe 1 : badges réguliers (conditions sur sessions uniquement)
  for (const badge of BADGE_DEFINITIONS) {
    if (badge.id.startsWith('collector_')) continue;
    if (alreadyEarned.includes(badge.id)) continue;
    if (badge.condition(sessions, alreadyEarned.length)) {
      newBadges.push(badge.id);
    }
  }

  // Passe 2 : badges méta (collectionneurs) — évalués avec le total mis à jour
  const totalEarned = alreadyEarned.length + newBadges.length;
  for (const badge of BADGE_DEFINITIONS) {
    if (!badge.id.startsWith('collector_')) continue;
    if (alreadyEarned.includes(badge.id)) continue;
    if (badge.condition(sessions, totalEarned)) {
      newBadges.push(badge.id);
    }
  }

  return newBadges;
}
