/**
 * src/types/index.ts
 *
 * Point d'entrée unique pour tous les types TypeScript du projet Quizzly.
 * Centralise les types partagés entre composants, stores et données :
 *   - types primitifs (AgeGroup, Difficulty, Category, Locale)
 *   - interfaces de domaine (Profile, QuizSession, Question, QuestionFile)
 *   - types d'état UI (QuizStatus, AnswerKey)
 *
 * Règle : tout type utilisé dans plus d'un fichier doit être défini ici.
 */

export type AgeGroup = '6-9' | '10-13';
export type Difficulty = 'easy' | 'medium' | 'hard';

// Identifiants de catégorie — correspondent aux noms de fichiers JSON (data/questions/{lang}/{category}.json)
export type Category = 'sciences' | 'histoire' | 'heroes';

export type Locale = 'en' | 'fr';

// ─── Profil utilisateur ────────────────────────────────────────────────────────

export interface Profile {
  pseudo: string;
  ageGroup: AgeGroup;
  avatarId: string;
  avatarStyle?: string; // Style DiceBear — défaut 'adventurer' si absent (rétro-compat profils existants)
  badgeEarned: boolean;
  locale: Locale;
  createdAt: string;
}

// ─── Session de jeu (historique persisté) ─────────────────────────────────────

export interface QuizSession {
  category: Category;
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
  age_group: AgeGroup;
  questions: Question[];      // Snapshot des questions (même ordre pour les 2 joueurs)
  score_a: number;
  total: number;              // Toujours 20
  challenged_by: string | null; // Pseudo Joueur B (null si pas encore joué)
  avatar_b: string | null;
  score_b: number | null;
  winner: 'a' | 'b' | 'draw' | null;
  status: ChallengeStatus;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
}
