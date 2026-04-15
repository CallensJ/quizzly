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

import { supabase } from './supabaseBrowser';
import { getDB, CACHE_TTL_MS } from './db';
import type { Category, Difficulty, Locale, MythSubcategory, Question } from '@/types';

// ─── Imports statiques JSON locaux ────────────────────────────────────────────
//
// Webpack ne peut PAS analyser les template literals dynamiques pour les imports.
// Ces imports statiques garantissent que les fichiers sont inclus dans le bundle
// et disponibles offline sans réseau ni cache IndexedDB.
//
// IMPORTANT — double protection premium :
//   Seules les catégories GRATUITES sont bundlées ici pour le fallback offline.
//   Les catégories premium (math, sport, geographie, francais…) ne sont PAS incluses —
//   elles ne sont accessibles que via Supabase + RLS (abonnement actif requis).
//   Les fichiers JSON premium existent dans src/data/ uniquement pour le script
//   de migration Supabase (scripts/migrate-questions.ts).
const LOCAL_JSON_MAP: Partial<Record<string, () => Promise<unknown>>> = {
  'fr/sciences': () => import('../data/questions/fr/sciences.json'),
  'fr/histoire': () => import('../data/questions/fr/histoire.json'),
  'fr/heroes':   () => import('../data/questions/fr/heroes.json'),
  'en/sciences': () => import('../data/questions/en/sciences.json'),
  'en/histoire': () => import('../data/questions/en/histoire.json'),
  'en/heroes':   () => import('../data/questions/en/heroes.json'),
};

async function loadLocalJSON(
  category: Category,
  locale: Locale
): Promise<Question[] | null> {
  const loader = LOCAL_JSON_MAP[`${locale}/${category}`];
  if (!loader) return null;
  // Les modules JSON webpack exposent la valeur sous `.default`
  const mod = await loader() as { default?: { questions?: Question[] }; questions?: Question[] };
  const data = (mod.default ?? mod) as { questions?: Question[] };
  return data.questions ?? null;
}

// ─── Clé de cache ─────────────────────────────────────────────────────────────

function cacheKey(category: Category, locale: Locale, subcategory?: MythSubcategory): string {
  return subcategory
    ? `erudia-q-${category}-${subcategory}-${locale}`
    : `erudia-q-${category}-${locale}`;
}

// ─── Cache IndexedDB ──────────────────────────────────────────────────────────

async function getCache(category: Category, locale: Locale, subcategory?: MythSubcategory): Promise<Question[] | null> {
  const db = getDB();
  if (!db) return null;
  try {
    const entry = await db.questionCache.get(cacheKey(category, locale, subcategory));
    if (!entry) return null;
    // Cache expiré → retourne null pour forcer le fetch Supabase
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return entry.questions;
  } catch {
    return null;
  }
}

async function getStaleCache(category: Category, locale: Locale, subcategory?: MythSubcategory): Promise<Question[] | null> {
  // Sans vérification TTL — utilisé comme fallback offline
  const db = getDB();
  if (!db) return null;
  try {
    const entry = await db.questionCache.get(cacheKey(category, locale, subcategory));
    return entry?.questions ?? null;
  } catch {
    return null;
  }
}

async function setCache(category: Category, locale: Locale, questions: Question[], subcategory?: MythSubcategory): Promise<void> {
  const db = getDB();
  if (!db) return;
  try {
    await db.questionCache.put({ key: cacheKey(category, locale, subcategory), questions, cachedAt: Date.now() });
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
  subcategory?: string | null;
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
    ...(row.subcategory ? { subcategory: row.subcategory as MythSubcategory } : {}),
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

// ─── Limite gratuite ──────────────────────────────────────────────────────────
//
// Les utilisateurs gratuits voient un sous-ensemble déterministe de 100 questions
// par catégorie+locale. Le seed garantit que ce sont toujours les mêmes 100 questions
// (cohérence entre sessions), sans modification côté Supabase ni RLS.

export const FREE_QUESTIONS_LIMIT = 100;

/**
 * Applique la limite de questions gratuites.
 * Pour les premium : retourne le pool complet.
 * Pour les gratuits : retourne un sous-ensemble de 100 questions déterministe
 *   (seed basé sur category+locale → même 100 questions à chaque session).
 */
export function applyFreeLimit(
  questions: Question[],
  isPremium: boolean,
  category: Category,
  locale: Locale
): Question[] {
  if (isPremium) return questions;
  if (questions.length <= FREE_QUESTIONS_LIMIT) return questions;

  // Seed numérique déterministe : somme des charCodes de "category-locale"
  const seed = `${category}-${locale}`
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);

  // Hash sur l'ID complet pour une distribution uniforme même avec des IDs préfixés
  // (ex. hist-fr-0001, hist-fr-0002 ont le même charCodeAt(0) = 'h')
  const hashId = (id: string) => id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  // Tri déterministe via hash Math.sin — même résultat à chaque appel
  const shuffled = [...questions].sort((a, b) => {
    const ha = Math.sin(seed + hashId(a.id)) * 10000;
    const hb = Math.sin(seed + hashId(b.id)) * 10000;
    return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
  });

  return shuffled.slice(0, FREE_QUESTIONS_LIMIT);
}

// ─── Fetch principal ──────────────────────────────────────────────────────────

/**
 * Récupère les questions pour une catégorie + locale donnée.
 * Pour mythology : passer `subcategory` pour filtrer par civilisation.
 *
 * @throws Error si Supabase est inaccessible ET qu'il n'y a pas de cache
 */
export async function fetchQuestions(
  category: Category,
  locale: Locale,
  difficulty: Difficulty,
  isPremium: boolean,            // détermine si la limite de 100 questions s'applique
  subcategory?: MythSubcategory  // filtre sous-catégorie (mythology uniquement)
): Promise<Question[]> {
  const diffPool = getDifficultyPool(difficulty);

  function filterByPool(qs: Question[]): Question[] {
    return qs.filter((q) => diffPool.includes(q.difficulty));
  }

  function limitPool(qs: Question[]): Question[] {
    return applyFreeLimit(qs, isPremium, category, locale);
  }

  // 1. Cache IndexedDB valide → retour immédiat (offline ou online)
  const cached = await getCache(category, locale, subcategory);
  if (cached) {
    const filtered = filterByPool(cached);
    if (filtered.length > 0) return limitPool(filtered);
  }

  // 2. Fetch Supabase — toutes les difficultés de ce (category, locale[, subcategory])
  //    Un seul appel réseau → tout mis en cache pour les requêtes suivantes
  //    La RLS retourne 0 lignes (pas d'erreur explicite) si l'abonnement est inactif.
  try {
    // subcategory n'existe que pour mythology — on l'inclut uniquement si nécessaire
    // pour éviter un 400 si la colonne n'est pas encore migrée sur l'instance cible.
    const selectFields = category === 'mythology'
      ? 'id, difficulty, question, option_a, option_b, option_c, option_d, answer, subcategory'
      : 'id, difficulty, question, option_a, option_b, option_c, option_d, answer';

    let query = supabase
      .from('questions')
      .select(selectFields)
      .eq('category', category)
      .eq('locale', locale);

    // Filtre sous-catégorie pour mythology
    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    // 0 lignes = catégorie premium sans abonnement actif (RLS silencieuse)
    // On lève une erreur typée pour que l'UI puisse afficher le bon message.
    if (!data || data.length === 0) {
      const err = new Error('No questions found') as Error & { code?: string };
      err.code = 'PREMIUM_REQUIRED';
      throw err;
    }

    const questions = (data as unknown as QuestionRow[]).map(rowToQuestion);
    await setCache(category, locale, questions, subcategory);

    return limitPool(filterByPool(questions));
  } catch (fetchError) {
    // 3. Fallback : cache périmé (offline ou erreur réseau)
    const stale = await getStaleCache(category, locale, subcategory);
    if (stale) return limitPool(filterByPool(stale));

    // 4. Fallback : fichiers JSON locaux (src/data/questions/{locale}/{category}.json)
    //    Garantit le fonctionnement offline même sans cache IndexedDB.
    //    IMPORTANT : imports statiques requis — webpack ne peut pas analyser
    //    les template literals dynamiques et n'inclut pas les fichiers dans le bundle.
    try {
      const localQuestions = await loadLocalJSON(category, locale);
      if (localQuestions && localQuestions.length > 0) {
        await setCache(category, locale, localQuestions, subcategory);
        return limitPool(filterByPool(subcategory
          ? localQuestions.filter((q) => q.subcategory === subcategory)
          : localQuestions
        ));
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

  // Seules les catégories gratuites sont pré-chargées — les catégories premium
  // sont chargées à la demande (fetchQuestions) uniquement si l'utilisateur est abonné.
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
          const localQuestions = await loadLocalJSON(category, locale);
          if (localQuestions?.length) {
            await setCache(category, locale, localQuestions);
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
