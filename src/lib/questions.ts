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

// ─── Imports statiques JSON locaux ────────────────────────────────────────────
//
// Webpack ne peut PAS analyser les template literals dynamiques pour les imports.
// Ces imports statiques garantissent que les fichiers sont inclus dans le bundle
// et disponibles offline sans réseau ni cache IndexedDB.
//
const LOCAL_JSON_MAP: Partial<Record<string, () => Promise<{ questions: Question[] }>>> = {
  'fr/sciences': () => import('../data/questions/fr/sciences.json') as Promise<{ questions: Question[] }>,
  'fr/histoire': () => import('../data/questions/fr/histoire.json') as Promise<{ questions: Question[] }>,
  'fr/heroes':   () => import('../data/questions/fr/heroes.json')   as Promise<{ questions: Question[] }>,
  'en/sciences': () => import('../data/questions/en/sciences.json') as Promise<{ questions: Question[] }>,
  'en/histoire': () => import('../data/questions/en/histoire.json') as Promise<{ questions: Question[] }>,
  'en/heroes':   () => import('../data/questions/en/heroes.json')   as Promise<{ questions: Question[] }>,
};

async function loadLocalJSON(
  category: Category,
  locale: Locale
): Promise<{ questions: Question[] } | null> {
  const loader = LOCAL_JSON_MAP[`${locale}/${category}`];
  if (!loader) return null;
  return loader();
}

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
    //    IMPORTANT : imports statiques requis — webpack ne peut pas analyser
    //    les template literals dynamiques et n'inclut pas les fichiers dans le bundle.
    try {
      const localData = await loadLocalJSON(category, locale);
      if (localData) {
        const questions: Question[] = localData.questions as Question[];
        if (questions && questions.length > 0) {
          await setCache(category, locale, questions);
          return filterByPool(questions);
        }
      }
    } catch {
      // Fichier JSON local absent — erreur originale remontera
    }

    // 5. Pas de cache, pas de JSON local → erreur remontée à l'UI
    throw fetchError;
  }
}

/**
 * Pré-chauffe le cache IndexedDB pour toutes les catégories et locales.
 * À appeler en arrière-plan au montage de l'app (HomeScreen) quand le réseau est disponible.
 * Garantit que les questions sont disponibles offline lors de la prochaine visite.
 */
export async function prewarmQuestionsCache(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  const categories: Category[] = ['sciences', 'histoire', 'heroes'];
  const locales: Locale[] = ['fr', 'en'];

  await Promise.allSettled(
    categories.flatMap((category) =>
      locales.map(async (locale) => {
        // Ne pré-charge que si le cache est absent ou périmé
        const existing = await getCache(category, locale);
        if (existing && existing.length > 0) return;

        try {
          const { data, error } = await supabase
            .from('questions')
            .select('id, difficulty, question, option_a, option_b, option_c, option_d, answer')
            .eq('category', category)
            .eq('locale', locale);

          if (error || !data || data.length === 0) throw new Error('Supabase unavailable');
          await setCache(category, locale, (data as QuestionRow[]).map(rowToQuestion));
        } catch {
          // Fallback : on met en cache les JSON locaux si Supabase échoue
          const localData = await loadLocalJSON(category, locale);
          if (localData?.questions?.length) {
            await setCache(category, locale, localData.questions);
          }
        }
      })
    )
  );
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
