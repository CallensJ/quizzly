/**
 * src/lib/goals.ts
 *
 * Fonctions pures de calcul des objectifs de score par catégorie.
 * Aucun effet de bord, aucun import du store.
 *
 * GoalCategory est déclaré dans @/types (Exclude<Category, 'math'>).
 *
 * Toutes les "semaines" utilisent ISO 8601 :
 *   - Lundi = premier jour de la semaine
 *   - Format clé : "YYYY-Www" (ex: "2026-W13")
 */

import type { QuizSession, GoalCategory, WeeklyAvg, GoalStatus } from '@/types';

function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getLast8WeekKeys(): string[] {
  const now = new Date(Date.now());
  const keys: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - i * 7
    ));
    keys.push(getISOWeekKey(d));
  }
  return keys; // 8 dates espacées de 7 jours → 8 semaines ISO distinctes garanties (7 jours = exactement 1 semaine ISO)
}

/**
 * Retourne une valeur non arrondie — arrondir côté consommateur (Math.round) si nécessaire pour l'affichage.
 */
export function getCategoryAvg(
  sessions: QuizSession[],
  category: GoalCategory,
  weekOnly?: boolean
): number | null {
  let filtered = sessions.filter(
    (s) => s.category === category && s.totalQuestions > 0
  );

  if (weekOnly) {
    const currentWeek = getISOWeekKey(new Date(Date.now()));
    filtered = filtered.filter(
      (s) => getISOWeekKey(new Date(s.playedAt)) === currentWeek
    );
  }

  if (filtered.length === 0) return null;

  const total = filtered.reduce(
    (sum, s) => sum + (s.score / s.totalQuestions) * 100,
    0
  );
  return total / filtered.length;
}

export function getCategoryTrend(
  sessions: QuizSession[],
  category: GoalCategory
): WeeklyAvg[] {
  const weekKeys = getLast8WeekKeys();

  const byWeek: Record<string, { sum: number; count: number }> = {};
  for (const key of weekKeys) {
    byWeek[key] = { sum: 0, count: 0 };
  }

  for (const s of sessions) {
    if (s.category !== category || s.totalQuestions === 0) continue;
    const key = getISOWeekKey(new Date(s.playedAt));
    if (!(key in byWeek)) continue;
    byWeek[key].sum += (s.score / s.totalQuestions) * 100;
    byWeek[key].count += 1;
  }

  return weekKeys.map((week) => {
    const { sum, count } = byWeek[week];
    return { week, avg: count > 0 ? sum / count : 0, count };
  });
}

export function getGoalStatus(
  sessions: QuizSession[],
  goals: Partial<Record<GoalCategory, number>>
): GoalStatus[] {
  return (Object.entries(goals) as [GoalCategory, number][]).map(
    ([category, target]) => ({
      category,
      target,
      overallAvg: getCategoryAvg(sessions, category),
      weekAvg:    getCategoryAvg(sessions, category, true),
      trend:      getCategoryTrend(sessions, category),
    })
  );
}
