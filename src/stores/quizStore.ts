// src/stores/quizStore.ts
//
// État du quiz en cours — NON persisté (session mémoire uniquement).
// Le profileStore gère la persistance des sessions terminées.
//
// Flux : idle → (startQuiz) → playing → (nextQuestion × 20) → finished
//        finished → (resetQuiz) → idle

import { create } from 'zustand';
import type { Category, Difficulty, Question, AnswerKey, QuizStatus } from '@/types';

// Nombre de questions par partie (fixe pour MVP 1)
const QUESTIONS_PER_GAME = 20;

interface QuizState {
  // ── Sélections de l'écran Home ──────────────────────────────────────────────
  category: Category | null;
  difficulty: Difficulty | null;

  // ── Déroulement de la partie ─────────────────────────────────────────────────
  status: QuizStatus;
  questions: Question[];      // 20 questions tirées aléatoirement
  currentIndex: number;       // 0-based
  score: number;
  selectedAnswer: AnswerKey | null; // réponse du joueur pour la question courante

  // ── Actions ───────────────────────────────────────────────────────────────────
  setCategory: (category: Category) => void;
  setDifficulty: (difficulty: Difficulty) => void;

  /**
   * Démarre une partie. Reçoit le pool complet filtré (catégorie + difficulté)
   * depuis le composant, tire 20 questions aléatoirement et lance le jeu.
   */
  startQuiz: (pool: Question[]) => void;

  /** Enregistre la réponse du joueur pour la question courante. */
  selectAnswer: (answer: AnswerKey) => void;

  /**
   * Passe à la question suivante.
   * Si c'était la dernière question, passe le status à 'finished'.
   */
  nextQuestion: () => void;

  /** Remet le quiz à zéro (garde catégorie + difficulté pour "Rejouer"). */
  resetQuiz: () => void;

  /** Remet tout à zéro (retour Home). */
  resetAll: () => void;
}

// Tire n éléments aléatoires sans remise depuis un tableau
function sampleRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export const useQuizStore = create<QuizState>()((set, get) => ({
  category: null,
  difficulty: null,
  status: 'idle',
  questions: [],
  currentIndex: 0,
  score: 0,
  selectedAnswer: null,

  setCategory: (category) => set({ category }),

  setDifficulty: (difficulty) => set({ difficulty }),

  startQuiz: (pool) => {
    const questions = sampleRandom(pool, Math.min(QUESTIONS_PER_GAME, pool.length));
    set({
      status: 'playing',
      questions,
      currentIndex: 0,
      score: 0,
      selectedAnswer: null,
    });
  },

  selectAnswer: (answer) => {
    const { questions, currentIndex, score, selectedAnswer } = get();

    // Empêche de changer de réponse après avoir sélectionné
    if (selectedAnswer !== null) return;

    const isCorrect = answer === questions[currentIndex]?.answer;
    set({
      selectedAnswer: answer,
      score: isCorrect ? score + 1 : score,
    });
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    const isLast = currentIndex >= questions.length - 1;

    set({
      currentIndex: isLast ? currentIndex : currentIndex + 1,
      selectedAnswer: null,
      status: isLast ? 'finished' : 'playing',
    });
  },

  resetQuiz: () =>
    set({
      status: 'idle',
      questions: [],
      currentIndex: 0,
      score: 0,
      selectedAnswer: null,
      // Conserve category + difficulty pour "Rejouer"
    }),

  resetAll: () =>
    set({
      category: null,
      difficulty: null,
      status: 'idle',
      questions: [],
      currentIndex: 0,
      score: 0,
      selectedAnswer: null,
    }),
}));
