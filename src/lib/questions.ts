/**
 * src/lib/questions.ts
 *
 * Service de chargement des questions.
 * Source de données : table Supabase `questions`, avec double fallback.
 *
 * Stratégie offline-first :
 *   1. Si cache IndexedDB valide (< 24h) → retour immédiat
 *   2. Sinon → fetch Supabase → cache le résultat complet (toutes difficultés)
 *   3. Si Supabase échoue et cache présent (même expiré) → fallback cache
 *   4. Si pas de cache du tout → fallback fichiers JSON locaux (src/data/questions/)
 *   5. Si JSON local introuvable → throw (l'UI affiche un message d'erreur)
 *
 * Le cache stocke toutes les difficultés d'un (category, locale) ensemble.
 * Le filtrage par difficulté se fait côté client après récupération.
 *
 * Migration MVP 2 : cache migré localStorage → IndexedDB (Dexie) pour
 * une meilleure capacité de stockage et une gestion TTL plus robuste.
 */

import { supabase } from './supabase';
import { getDB, CACHE_TTL_MS } from './db';
import type { Category, Difficulty, Locale, Question } from '@/types';

// ─── Clé de cache ─────────────────────────────────────────────────────────────

function cacheKey(category: Category, locale: Locale): string {
  return `erudia-q-${category}-${locale}`;
}

// ─── Cache IndexedDB ──────────────────────────────────────────────────────────

async function getCache(category: Category, locale: Locale): Promise<Question[] | null> {
  const db = getDB();
  if (!db) return null;
  try {
    const entry = await db.questionCache.get(cacheKey(category, locale));
    if (!entry) return null;
    // Cache expiré → retourne null pour forcer le fetch Supabase
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return entry.questions;
  } catch {
    return null;
  }
}

async function getStaleCache(category: Category, locale: Locale): Promise<Question[] | null> {
  // Sans vérification TTL — utilisé comme fallback offline
  const db = getDB();
  if (!db) return null;
  try {
    const entry = await db.questionCache.get(cacheKey(category, locale));
    return entry?.questions ?? null;
  } catch {
    return null;
  }
}

async function setCache(category: Category, locale: Locale, questions: Question[]): Promise<void> {
  const db = getDB();
  if (!db) return;
  try {
    await db.questionCache.put({ key: cacheKey(category, locale), questions, cachedAt: Date.now() });
  } catch {
    // IndexedDB indisponible — silencieux (l'app fonctionne sans cache)
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

// ─── Mapping difficulté ───────────────────────────────────────────────────────
//
// Mapping direct : le joueur choisit lui-même son niveau.
// Les questions sont calibrées 6-11 ans avec un plafond jusqu'à ~13 ans
// pour garantir du challenge sur le long terme.
// L'app cible 6-11 ans — la sélection de tranche d'âge a été supprimée (MVP 4).
//
function getDifficultyPool(difficulty: Difficulty): Difficulty[] {
  return [difficulty];
}

// ─── Fetch principal ──────────────────────────────────────────────────────────

/**
 * Récupère les questions pour une catégorie + locale donnée.
 *
 * @throws Error si Supabase est inaccessible ET qu'il n'y a pas de cache
 */
export async function fetchQuestions(
  category: Category,
  locale: Locale,
  difficulty: Difficulty
): Promise<Question[]> {
  const diffPool = getDifficultyPool(difficulty);

  function filterByPool(qs: Question[]): Question[] {
    return qs.filter((q) => diffPool.includes(q.difficulty));
  }

  // 1. Cache IndexedDB valide → retour immédiat (offline ou online)
  const cached = await getCache(category, locale);
  if (cached) {
    const filtered = filterByPool(cached);
    if (filtered.length > 0) return filtered;
  }

  // 2. Fetch Supabase — toutes les difficultés de ce (category, locale)
  //    Un seul appel réseau → tout mis en cache pour les requêtes suivantes
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('id, difficulty, question, option_a, option_b, option_c, option_d, answer')
      .eq('category', category)
      .eq('locale', locale);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('No questions found');

    const questions = (data as QuestionRow[]).map(rowToQuestion);
    await setCache(category, locale, questions);

    return filterByPool(questions);
  } catch (fetchError) {
    // 3. Fallback : cache périmé (offline ou erreur réseau)
    const stale = await getStaleCache(category, locale);
    if (stale) return filterByPool(stale);

    // 4. Fallback : fichiers JSON locaux (src/data/questions/{locale}/{category}.json)
    //    Garantit le fonctionnement offline même sans cache IndexedDB.
    try {
      const localData = await import(`../data/questions/${locale}/${category}.json`);
      const questions: Question[] = localData.questions as Question[];
      if (questions && questions.length > 0) {
        await setCache(category, locale, questions);
        return filterByPool(questions);
      }
    } catch {
      // Fichier JSON local absent — erreur originale remontera
    }

    // 5. Pas de cache, pas de JSON local → erreur remontée à l'UI
    throw fetchError;
  }
}

/**
 * Invalide le cache pour une catégorie+locale.
 * Utile si les questions ont été mises à jour en base.
 */
export async function invalidateQuestionsCache(category: Category, locale: Locale): Promise<void> {
  const db = getDB();
  if (!db) return;
  try {
    await db.questionCache.delete(cacheKey(category, locale));
  } catch {
    // Silencieux
  }
}
