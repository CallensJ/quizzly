/**
 * src/types/index.ts
 *
 * Point d'entrée unique pour tous les types TypeScript du projet Quizzly.
 * Centralise les types partagés entre composants, stores et données :
 *   - types primitifs (Difficulty, Category, Locale)
 *   - interfaces de domaine (Profile, QuizSession, Question, QuestionFile)
 *   - types d'état UI (QuizStatus, AnswerKey)
 *
 * Règle : tout type utilisé dans plus d'un fichier doit être défini ici.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

// Identifiants de catégorie — correspondent aux valeurs `category` stockées en base Supabase
// Catégories gratuites   : sciences, histoire, heroes, animaux-nature
// Catégories premium FR+EN : math, sport, geographie, francais
// Catégories premium FR  : anglais, art, corps-humain, cuisine, dinosaures,
//                          education-civique, environnement, espace-astronomie
// Catégories à venir     : musique, pop-culture, technologie (pas encore migrées)
// Catégorie parente      : mythology (jouée via MythSubcategory)
export type Category =
  | 'sciences' | 'histoire' | 'heroes' | 'animaux-nature'
  | 'math' | 'sport' | 'geographie' | 'francais'
  | 'anglais' | 'art' | 'corps-humain' | 'cuisine'
  | 'dinosaures' | 'education-civique' | 'environnement' | 'espace-astronomie'
  | 'musique' | 'pop-culture' | 'technologie'
  | 'mythology';

// Sous-catégories de Mythology — chaque civilisation est une sous-catégorie indépendante
// La valeur correspond au champ `subcategory` en base Supabase
export type MythSubcategory =
  | 'greco-roman'   // Greco-Romaine — GRATUITE (aperçu freemium)
  | 'egypt'         // Égyptienne
  | 'nordic'        // Nordique
  | 'celtic'        // Celtique & légendes arthuriennes
  | 'amerindian'    // Amérindienne & Maya
  | 'asian'         // Asiatique (Chine · Japon · Inde)
  | 'african';      // Africaine

// Catégories ayant des objectifs de score configurables (gratuites jouables)
export type GoalCategory = Exclude<Category, 'math' | 'mythology'>;

// ─── Objectifs par catégorie ───────────────────────────────────────────────────

export interface WeeklyAvg {
  week: string;   // format "2026-W13" (ISO 8601 week)
  avg: number;    // score % moyen (0–100), 0 si count=0
  count: number;  // nombre de parties dans la semaine
}

export interface GoalStatus {
  category: GoalCategory;
  target: number;              // % cible (50–90)
  overallAvg: number | null;   // avg toutes sessions valides
  weekAvg: number | null;      // avg semaine ISO courante (null si aucune partie)
  trend: WeeklyAvg[];          // 8 semaines glissantes
}

export type Locale = 'en' | 'fr';

// ─── Profil utilisateur ────────────────────────────────────────────────────────

export interface Profile {
  id: string;           // UUID unique par profil enfant (ajouté MVP 4 multi-profils)
  pseudo: string;
  avatarId: string;
  avatarStyle?: string; // Style DiceBear — défaut 'adventurer' si absent (rétro-compat profils existants)
  badgeEarned: boolean;
  locale: Locale;
  createdAt: string;
}

// ─── Session de jeu (historique persisté) ─────────────────────────────────────

export interface QuizSession {
  category: Category;
  /** Sous-catégorie — uniquement pour category='mythology'. Rétro-compat : absent sur sessions existantes. */
  subcategory?: MythSubcategory;
  difficulty: Difficulty;
  score: number;
  totalQuestions: number;
  playedAt: string;
}

// ─── Structure JSON des questions (doit correspondre aux fichiers data/) ───────

export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export interface Question {
  id: string;           // ex: "sci-easy-001"
  difficulty: Difficulty;
  question: string;     // texte de la question
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: AnswerKey;    // lettre de la bonne réponse
  /** Sous-catégorie — présent uniquement pour les questions de mythology */
  subcategory?: MythSubcategory;
}

export interface QuestionFile {
  category: Category;
  lang: Locale;
  questions: Question[];
}

// ─── État du quiz en cours (non persisté) ─────────────────────────────────────

export type QuizStatus = 'idle' | 'playing' | 'finished';

// ─── Mode multijoueur — Duel asynchrone (MVP 4) ────────────────────────────────

export type ChallengeStatus = 'pending' | 'completed' | 'expired';

/**
 * Représente un défi entre deux joueurs.
 * Joueur A crée le challenge après son quiz, Joueur B le rejoint via un code court.
 * Les questions sont snapshotées au moment de la création pour garantir
 * la même partie aux deux joueurs.
 */
export interface Challenge {
  id: string;
  code: string;               // Code 6 chars, ex: "ZBRE7K"
  created_by: string;         // Pseudo Joueur A
  avatar_a: string | null;    // Seed avatar Joueur A
  category: Category;
  difficulty: Difficulty;
  locale: Locale;
  age_group: string; // Valeur fixe '6-11' depuis MVP 4 — champ conservé pour rétro-compat Supabase
  questions: Question[];      // Snapshot des questions (même ordre pour les 2 joueurs)
  score_a: number;
  time_a: number | null;      // Temps total de réponse Joueur A en ms (null = ancienne version)
  total: number;              // Toujours 20
  challenged_by: string | null; // Pseudo Joueur B (null si pas encore joué)
  avatar_b: string | null;
  score_b: number | null;
  time_b: number | null;      // Temps total de réponse Joueur B en ms
  winner: 'a' | 'b' | 'draw' | null;
  status: ChallengeStatus;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
}
