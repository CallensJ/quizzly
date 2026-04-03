// src/stores/quizStore.ts
//
// État du quiz en cours — NON persisté (session mémoire uniquement).
// Le profileStore gère la persistance des sessions terminées.
//
// Flux : idle → (startQuiz) → playing → (nextQuestion × 20) → finished
//        finished → (resetQuiz) → idle

import { create } from 'zustand';
import type { Category, Difficulty, MythSubcategory, Question, AnswerKey, QuizStatus } from '@/types';

// Nombre de questions par partie (fixe pour MVP 1)
const QUESTIONS_PER_GAME = 20;

interface QuizState {
  // ── Sélections de l'écran Home ──────────────────────────────────────────────
  category: Category | null;
  difficulty: Difficulty | null;
  /** Sous-catégorie active — uniquement pour category='mythology'. */
  subcategory: MythSubcategory | null;

  // ── Déroulement de la partie ─────────────────────────────────────────────────
  status: QuizStatus;
  questions: Question[];      // 20 questions tirées aléatoirement
  currentIndex: number;       // 0-based
  score: number;
  selectedAnswer: AnswerKey | null; // réponse du joueur pour la question courante

  // ── Mode défi asynchrone (MVP 4) ─────────────────────────────────────────────
  // Code du challenge en cours (non null = Joueur B joue un défi)
  // Utilisé par ResultsScreen pour afficher la comparaison et mettre à jour Supabase
  challengeId: string | null;

  // ── Mode défi quotidien (MVP 4) ───────────────────────────────────────────────
  // true = le quiz en cours est le défi du jour (questions seedées par la date)
  isDailyChallenge: boolean;

  // ── Scoring basé sur le temps (MVP 4 — départage en duel) ───────────────────
  // Temps d'affichage de la question courante (ms depuis epoch) — null entre questions
  questionStartTime: number | null;
  // Cumul des temps de réponse sur toutes les questions répondues (ms)
  // Utilisé comme départage en duel : même score → le plus rapide gagne
  totalTimeMs: number;

  // ── Actions ───────────────────────────────────────────────────────────────────
  setCategory: (category: Category) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setSubcategory: (subcategory: MythSubcategory | null) => void;

  /**
   * Démarre une partie. Reçoit le pool complet filtré (catégorie + difficulté)
   * depuis le composant, tire 20 questions aléatoirement et lance le jeu.
   */
  startQuiz: (pool: Question[]) => void;

  /**
   * Démarre un quiz en mode défi (Joueur B).
   * Les questions sont fournies telles quelles (snapshot du challenge — même ordre que Joueur A).
   * Pas de shuffle ni de sample : les deux joueurs jouent exactement les mêmes questions.
   */
  startChallengeQuiz: (questions: Question[], challengeCode: string) => void;

  /**
   * Démarre le défi quotidien.
   * Les questions sont fournies pré-seedées par daily.ts (ordre déterministe par date).
   * Pas de shuffle supplémentaire — toujours le même quiz pour tout le monde aujourd'hui.
   * category + difficulty requis pour que ResultsScreen puisse les afficher correctement.
   */
  startDailyQuiz: (questions: Question[], category: Category, difficulty: Difficulty) => void;

  /**
   * Démarre le chrono de la question courante.
   * Appelé depuis QuizScreen quand la question est affichée et que le joueur peut répondre.
   */
  startQuestionTimer: () => void;

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
  subcategory: null,
  status: 'idle',
  questions: [],
  currentIndex: 0,
  score: 0,
  selectedAnswer: null,
  challengeId: null,
  isDailyChallenge: false,
  questionStartTime: null,
  totalTimeMs: 0,

  setCategory: (category) => set({ category, subcategory: null }),

  setDifficulty: (difficulty) => set({ difficulty }),

  setSubcategory: (subcategory) => set({ subcategory }),

  startQuiz: (pool) => {
    const questions = sampleRandom(pool, Math.min(QUESTIONS_PER_GAME, pool.length))
      .map(shuffleOptions);
    set({
      status: 'playing',
      questions,
      currentIndex: 0,
      score: 0,
      selectedAnswer: null,
      challengeId: null,       // mode normal — pas de défi
      isDailyChallenge: false,
      questionStartTime: null,
      totalTimeMs: 0,
    });
  },

  startChallengeQuiz: (questions, challengeCode) => {
    // Mode défi : questions fournies telles quelles depuis le snapshot Supabase.
    // Les options sont déjà dans leur ordre d'origine — on ne re-shuffle pas
    // pour garantir la même expérience visuelle que Joueur A.
    set({
      status: 'playing',
      questions,
      currentIndex: 0,
      score: 0,
      selectedAnswer: null,
      challengeId: challengeCode,
      isDailyChallenge: false,
      questionStartTime: null,
      totalTimeMs: 0,
    });
  },

  startDailyQuiz: (questions, category, difficulty) => {
    // Défi quotidien : questions pré-seedées par getDailyQuestions() dans daily.ts.
    // Pas de re-shuffle — l'ordre déterministe garantit le même quiz pour tous.
    // category + difficulty transmis pour que ResultsScreen puisse les afficher.
    set({
      status: 'playing',
      questions,
      currentIndex: 0,
      score: 0,
      selectedAnswer: null,
      challengeId: null,
      isDailyChallenge: true,
      category,
      difficulty,
      questionStartTime: null,
      totalTimeMs: 0,
    });
  },

  startQuestionTimer: () => {
    // Enregistre l'instant d'affichage de la question courante.
    // Appelé par QuizScreen dès que le joueur peut interagir.
    set({ questionStartTime: Date.now() });
  },

  selectAnswer: (answer) => {
    const { questions, currentIndex, score, selectedAnswer, questionStartTime, totalTimeMs } = get();

    // Empêche de changer de réponse après avoir sélectionné
    if (selectedAnswer !== null) return;

    // Cumule le temps écoulé depuis le début de la question
    const elapsed = questionStartTime ? Date.now() - questionStartTime : 0;

    const isCorrect = answer === questions[currentIndex]?.answer;
    set({
      selectedAnswer: answer,
      score: isCorrect ? score + 1 : score,
      totalTimeMs: totalTimeMs + elapsed,
      questionStartTime: null, // réinitialise pour la prochaine question
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
      challengeId: null,
      isDailyChallenge: false,
      questionStartTime: null,
      totalTimeMs: 0,
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
      challengeId: null,
      isDailyChallenge: false,
      questionStartTime: null,
      totalTimeMs: 0,
    }),
}));
