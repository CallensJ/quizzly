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
// Catégories premium FR+EN : math, sport, geographie, francais, monde-antique
// Catégories premium FR  : anglais, art, corps-humain, cuisine, dinosaures,
//                          education-civique, environnement, espace-astronomie
// Catégories à venir     : musique, pop-culture, technologie (pas encore migrées)
//
// NOTE v1.4 : ce type liste encore les 21 catégories v1.0 (hors mythology, supprimée).
// La réduction aux 5 catégories officielles se fait en Sprint 2, en même temps que la
// suppression du split gratuit/premium par catégorie (remplacé par le trial 7 jours).
export type Category =
  | 'sciences' | 'histoire' | 'heroes' | 'animaux-nature'
  | 'math' | 'sport' | 'geographie' | 'francais'
  | 'anglais' | 'art' | 'corps-humain' | 'cuisine'
  | 'dinosaures' | 'education-civique' | 'environnement' | 'espace-astronomie'
  | 'musique' | 'pop-culture' | 'technologie' | 'monde-antique';

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

