/**
 * src/lib/recommendations.ts
 *
 * Algorithme de recommandations pédagogiques (MVP 4).
 * Analyse les sessions de jeu et génère des suggestions de catégories/niveaux.
 *
 * Types de recommandations :
 *   - level_up   : score moyen ≥ 75% → suggère le niveau supérieur
 *   - practice   : score moyen < 50% sur ≥ 3 parties → suggère de s'entraîner
 *   - try_new    : catégorie jamais jouée → suggère de découvrir
 *   - diversify  : > 80% des parties dans la même catégorie → suggère d'élargir
 *
 * Priorités (plus bas = affiché en premier) :
 *   1 = level_up (valorise la progression)
 *   2 = practice (remédie aux difficultés)
 *   3 = try_new  (découverte)
 *   4 = diversify (bien-être global)
 *
 * Retourne au maximum MAX_RECOMMENDATIONS suggestions.
 */

import type { Category, Difficulty, QuizSession } from '@/types';

// Catégories disponibles en version gratuite
const FREE_CATEGORIES: Category[] = ['sciences', 'histoire', 'heroes'];

// Ordre des niveaux pour les progressions
const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

export const MAX_RECOMMENDATIONS = 3;

// Seuils de l'algorithme
const THRESHOLD_LEVEL_UP  = 75; // avg ≥ 75% → prêt pour le niveau sup
const THRESHOLD_PRACTICE  = 50; // avg < 50% → besoin de s'entraîner
const MIN_SESSIONS_FOR_PRACTICE = 3; // sessions minimum pour déclencher "practice"

export type RecommendationType = 'level_up' | 'practice' | 'try_new' | 'diversify';

export interface Recommendation {
  type: RecommendationType;
  category: Category;
  difficulty: Difficulty;
  /** Score moyen observé sur cette combinaison (null si non joué) */
  avgScore: number | null;
  priority: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(score: number, total: number): number {
  return Math.round((score / total) * 100);
}

/**
 * Calcule les stats (count, avgScore) pour chaque combinaison (category, difficulty).
 */
function buildStatsMap(sessions: QuizSession[]): Map<string, { count: number; avgScore: number }> {
  const map = new Map<string, { count: number; total: number; sum: number }>();

  for (const s of sessions) {
    const key = `${s.category}:${s.difficulty}`;
    const entry = map.get(key) ?? { count: 0, total: 0, sum: 0 };
    entry.count++;
    entry.sum += pct(s.score, s.totalQuestions);
    map.set(key, entry);
  }

  const result = new Map<string, { count: number; avgScore: number }>();
  for (const [key, { count, sum }] of map) {
    result.set(key, { count, avgScore: Math.round(sum / count) });
  }
  return result;
}

// ─── Générateurs de recommandations ─────────────────────────────────────────

function getLevelUpRecs(
  stats: Map<string, { count: number; avgScore: number }>
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const cat of FREE_CATEGORIES) {
    for (let i = 0; i < DIFFICULTY_ORDER.length - 1; i++) {
      const diff    = DIFFICULTY_ORDER[i];
      const nextDiff = DIFFICULTY_ORDER[i + 1];
      const key     = `${cat}:${diff}`;
      const entry   = stats.get(key);

      if (entry && entry.avgScore >= THRESHOLD_LEVEL_UP) {
        // Vérifie que le niveau supérieur n'est pas déjà maîtrisé
        const nextKey   = `${cat}:${nextDiff}`;
        const nextEntry = stats.get(nextKey);
        if (!nextEntry || nextEntry.avgScore < THRESHOLD_LEVEL_UP) {
          recs.push({
            type: 'level_up',
            category: cat,
            difficulty: nextDiff,
            avgScore: entry.avgScore,
            priority: 1,
          });
        }
      }
    }
  }

  return recs;
}

function getPracticeRecs(
  stats: Map<string, { count: number; avgScore: number }>
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const cat of FREE_CATEGORIES) {
    for (const diff of DIFFICULTY_ORDER) {
      const key   = `${cat}:${diff}`;
      const entry = stats.get(key);

      if (
        entry &&
        entry.count >= MIN_SESSIONS_FOR_PRACTICE &&
        entry.avgScore < THRESHOLD_PRACTICE
      ) {
        recs.push({
          type: 'practice',
          category: cat,
          difficulty: diff,
          avgScore: entry.avgScore,
          priority: 2,
        });
      }
    }
  }

  // Trie par score croissant — les plus en difficulté en premier
  return recs.sort((a, b) => (a.avgScore ?? 0) - (b.avgScore ?? 0));
}

function getTryNewRecs(
  stats: Map<string, { count: number; avgScore: number }>
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const cat of FREE_CATEGORIES) {
    // Catégorie jamais jouée (aucun niveau)
    const hasAnySessions = DIFFICULTY_ORDER.some((diff) => stats.has(`${cat}:${diff}`));
    if (!hasAnySessions) {
      recs.push({
        type: 'try_new',
        category: cat,
        difficulty: 'easy',
        avgScore: null,
        priority: 3,
      });
    }
  }

  return recs;
}

function getDiversifyRec(sessions: QuizSession[]): Recommendation | null {
  if (sessions.length < 5) return null;

  // Catégorie la plus jouée
  const counts: Partial<Record<Category, number>> = {};
  for (const s of sessions) {
    counts[s.category] = (counts[s.category] ?? 0) + 1;
  }

  const [topCat, topCount] = Object.entries(counts).reduce(
    (best, curr) => (curr[1] > best[1] ? curr : best),
    ['', 0]
  );

  if (topCount / sessions.length < 0.8) return null; // pas de sur-représentation

  // Suggère une catégorie différente jamais ou peu jouée
  const otherCat = FREE_CATEGORIES.find(
    (c) => c !== topCat && (counts[c] ?? 0) < topCount * 0.2
  );
  if (!otherCat) return null;

  return {
    type: 'diversify',
    category: otherCat,
    difficulty: 'easy',
    avgScore: null,
    priority: 4,
  };
}

// ─── Export principal ─────────────────────────────────────────────────────────

/**
 * Génère les recommandations pédagogiques à partir des sessions de jeu.
 * Retourne au maximum MAX_RECOMMENDATIONS suggestions triées par priorité.
 */
export function getRecommendations(sessions: QuizSession[]): Recommendation[] {
  if (sessions.length === 0) return [];

  const stats = buildStatsMap(sessions);

  const candidates: Recommendation[] = [
    ...getLevelUpRecs(stats),
    ...getPracticeRecs(stats),
    ...getTryNewRecs(stats),
  ];

  const diversify = getDiversifyRec(sessions);
  if (diversify) candidates.push(diversify);

  // Déduplique par (category, difficulty) — garde la priorité la plus haute
  const seen = new Set<string>();
  const deduped = candidates.filter((r) => {
    const key = `${r.category}:${r.difficulty}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_RECOMMENDATIONS);
}
