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

// Identifiants de catégorie — correspondent aux valeurs `category` stockées en base Supabase.
// Les 5 catégories officielles v1.4 (cahier-des-charges-claude-v1.4.md §2). Accès uniforme aux
// 5 catégories, conditionné au trial 7 jours ou à l'abonnement — plus de split gratuit/premium
// par catégorie comme en v1.0.
export type Category =
  | 'histoire-du-monde'
  | 'culture-generale'
  | 'sciences-nature'
  | 'dinosaures'
  | 'espace';

export type Locale = 'en' | 'fr';

export type AppTheme = 'default' | 'blue' | 'pink';

// ─── Profil utilisateur ────────────────────────────────────────────────────────

export interface Profile {
  id: string;           // UUID unique par profil enfant (ajouté MVP 4 multi-profils)
  pseudo: string;
  avatarId: string;
  avatarStyle?: string; // Style DiceBear — défaut 'adventurer' si absent (rétro-compat profils existants)
  theme?: AppTheme;     // Thème de couleur — défaut 'default' si absent (rétro-compat)
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

