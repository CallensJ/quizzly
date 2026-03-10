/**
 * src/lib/questions.ts
 *
 * Service de chargement des questions — remplace les dynamic imports JSON.
 * Source de données : table Supabase `questions`.
 *
 * Stratégie offline-first :
 *   1. Si cache localStorage valide (< 24h) → retour immédiat
 *   2. Sinon → fetch Supabase → cache le résultat complet (toutes difficultés)
 *   3. Si Supabase échoue et cache présent (même expiré) → fallback cache
 *   4. Si pas de cache du tout → throw (l'UI affiche un message d'erreur)
 *
 * Le cache stocke toutes les difficultés d'un (category, locale) ensemble.
 * Le filtrage par difficulté se fait côté client après récupération.
 */

import { supabase } from './supabase';
import type { Category, Difficulty, Locale, Question } from '@/types';

// ─── Cache localStorage ───────────────────────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

interface QCache {
  questions: Question[];
  cachedAt: number;
}

function cacheKey(category: Category, locale: Locale): string {
  return `quizzly-q-${category}-${locale}`;
}

function getCache(category: Category, locale: Locale): Question[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(category, locale));
    if (!raw) return null;
    const data: QCache = JSON.parse(raw);
    // Cache expiré — on le garde quand même en mémoire pour le fallback offline
    // mais on signale qu'il doit être rafraîchi (retourne null pour forcer le fetch)
    if (Date.now() - data.cachedAt > CACHE_TTL_MS) return null;
    return data.questions;
  } catch {
    return null;
  }
}

function getStaleCache(category: Category, locale: Locale): Question[] | null {
  // Même fonction que getCache mais sans vérification TTL — fallback offline
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(category, locale));
    if (!raw) return null;
    const data: QCache = JSON.parse(raw);
    return data.questions;
  } catch {
    return null;
  }
}

function setCache(category: Category, locale: Locale, questions: Question[]): void {
  if (typeof window === 'undefined') return;
  try {
    const data: QCache = { questions, cachedAt: Date.now() };
    localStorage.setItem(cacheKey(category, locale), JSON.stringify(data));
  } catch {
    // localStorage plein ou désactivé — silencieux
  }
}

// ─── Format DB → Question ─────────────────────────────────────────────────────

interface QuestionRow {
  id: string;
  difficulty: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
}

function rowToQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    difficulty: row.difficulty as Difficulty,
    question: row.question,
    options: {
      A: row.option_a,
      B: row.option_b,
      C: row.option_c,
      D: row.option_d,
    },
    answer: row.answer as Question['answer'],
  };
}

// ─── Fetch principal ──────────────────────────────────────────────────────────

/**
 * Récupère les questions pour une catégorie + locale donnée.
 * Filtre optionnel par difficulté (si omis, retourne toutes les difficultés).
 *
 * @throws Error si Supabase est inaccessible ET qu'il n'y a pas de cache
 */
export async function fetchQuestions(
  category: Category,
  locale: Locale,
  difficulty?: Difficulty
): Promise<Question[]> {
  // 1. Cache valide → retour immédiat (offline ou online)
  const cached = getCache(category, locale);
  if (cached) {
    return difficulty ? cached.filter((q) => q.difficulty === difficulty) : cached;
  }

  // 2. Fetch Supabase — toutes les difficultés de ce (category, locale)
  //    On récupère tout pour ne faire qu'un seul appel réseau et tout mettre en cache
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('id, difficulty, question, option_a, option_b, option_c, option_d, answer')
      .eq('category', category)
      .eq('locale', locale);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('No questions found');

    const questions = (data as QuestionRow[]).map(rowToQuestion);
    setCache(category, locale, questions);

    return difficulty ? questions.filter((q) => q.difficulty === difficulty) : questions;
  } catch (fetchError) {
    // 3. Fallback : cache périmé (offline ou erreur réseau)
    const stale = getStaleCache(category, locale);
    if (stale) {
      return difficulty ? stale.filter((q) => q.difficulty === difficulty) : stale;
    }

    // 4. Pas de cache du tout → erreur remontée à l'UI
    throw fetchError;
  }
}

/**
 * Invalide le cache pour une catégorie+locale — utile si les questions
 * ont été mises à jour en base et qu'on veut forcer le rechargement.
 */
export function invalidateQuestionsCache(category: Category, locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(cacheKey(category, locale));
}
