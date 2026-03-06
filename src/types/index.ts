// src/types/index.ts

export type AgeGroup = '6-9' | '10-13';
export type Difficulty = 'easy' | 'medium' | 'hard';

// Identifiants de catégorie — correspondent aux noms de fichiers JSON (data/questions/{lang}/{category}.json)
export type Category = 'sciences' | 'histoire';

export type Locale = 'en' | 'fr';

// ─── Profil utilisateur ────────────────────────────────────────────────────────

export interface Profile {
  pseudo: string;
  ageGroup: AgeGroup;
  avatarId: string;
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
