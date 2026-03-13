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

/**
 * Fisher-Yates shuffle — distribution uniformément aléatoire.
 * Remplace le sort(() => Math.random() - 0.5) qui était biaisé
 * (certaines questions revenaient systématiquement plus souvent).
 */
function fisherYates<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Tire n éléments aléatoires sans remise depuis un tableau
function sampleRandom<T>(arr: T[], n: number): T[] {
  return fisherYates(arr).slice(0, n);
}

/**
 * Mélange les options A/B/C/D d'une question et met à jour la clé `answer`
 * pour qu'elle pointe toujours vers le texte correct après le shuffle.
 *
 * Appelé dans startQuiz — l'ordre est fixé une fois pour toute la partie,
 * ce qui évite un re-shuffle à chaque re-rendu et ne casse pas la logique
 * de selectAnswer (qui compare answer === questions[i].answer).
 */
function shuffleOptions(question: Question): Question {
  const keys: AnswerKey[] = ['A', 'B', 'C', 'D'];
  const correctText = question.options[question.answer];

  // Ordre mélangé des 4 options source (Fisher-Yates)
  const shuffled = fisherYates(keys);

  const newOptions = {
    A: question.options[shuffled[0]],
    B: question.options[shuffled[1]],
    C: question.options[shuffled[2]],
    D: question.options[shuffled[3]],
  };

  // La nouvelle lettre de la bonne réponse = celle qui porte le même texte
  const newAnswer = (keys).find((k) => newOptions[k] === correctText) as AnswerKey;

  return { ...question, options: newOptions, answer: newAnswer };
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
    const questions = sampleRandom(pool, Math.min(QUESTIONS_PER_GAME, pool.length))
      .map(shuffleOptions);
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
