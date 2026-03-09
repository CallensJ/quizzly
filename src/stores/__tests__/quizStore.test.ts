// src/stores/__tests__/quizStore.test.ts
//
// Tests unitaires du quizStore (logique métier du quiz).
// On teste uniquement la logique pure : transitions d'état, calcul du score,
// règles de navigation entre questions. Aucune interface graphique ici.
//
// Pattern utilisé : AAA (Arrange / Act / Assert)
//   - Arrange : préparer les données de test
//   - Act     : appeler l'action du store
//   - Assert  : vérifier que l'état résultant est correct

import { useQuizStore } from '../quizStore';
import type { Question } from '@/types';

// ─── Données de test ──────────────────────────────────────────────────────────

/**
 * Fabrique une question factice avec la bonne réponse 'A'.
 * Accepte un id pour différencier les questions dans un pool.
 */
function makeQuestion(id: string, answer: 'A' | 'B' | 'C' | 'D' = 'A'): Question {
  return {
    id,
    difficulty: 'easy',
    question: `Question ${id} ?`,
    options: { A: 'Bonne réponse', B: 'Mauvaise 1', C: 'Mauvaise 2', D: 'Mauvaise 3' },
    answer,
  };
}

/** Pool de 20 questions factices, toutes avec la bonne réponse 'A'. */
const pool20 = Array.from({ length: 20 }, (_, i) => makeQuestion(`q${i + 1}`));

/** Pool de 5 questions factices (pour tester le cas < 20). */
const pool5 = Array.from({ length: 5 }, (_, i) => makeQuestion(`small-q${i + 1}`));

// ─── Réinitialisation du store avant chaque test ──────────────────────────────

// Zustand conserve son état entre les tests car c'est un singleton.
// On réinitialise manuellement via resetAll() avant chaque test.
beforeEach(() => {
  useQuizStore.getState().resetAll();
});

// ─── Suite 1 : startQuiz ─────────────────────────────────────────────────────

describe('startQuiz', () => {

  it('démarre avec status "playing", score à 0, index à 0', () => {
    // Act
    useQuizStore.getState().startQuiz(pool20);

    // Assert
    const { status, score, currentIndex } = useQuizStore.getState();
    expect(status).toBe('playing');
    expect(score).toBe(0);
    expect(currentIndex).toBe(0);
  });

  it('sélectionne exactement 20 questions depuis un pool de 20', () => {
    useQuizStore.getState().startQuiz(pool20);

    const { questions } = useQuizStore.getState();
    expect(questions).toHaveLength(20);
  });

  it('prend toutes les questions si le pool en contient moins de 20', () => {
    // Pool de seulement 5 questions — on ne peut pas en tirer 20
    useQuizStore.getState().startQuiz(pool5);

    const { questions } = useQuizStore.getState();
    expect(questions).toHaveLength(5);
  });

  it('remet selectedAnswer à null au démarrage', () => {
    useQuizStore.getState().startQuiz(pool20);

    const { selectedAnswer } = useQuizStore.getState();
    expect(selectedAnswer).toBeNull();
  });

});

// ─── Suite 2 : selectAnswer ──────────────────────────────────────────────────

describe('selectAnswer', () => {

  it('incrémente le score si la réponse est correcte', () => {
    useQuizStore.getState().startQuiz(pool20);
    // Toutes les questions du pool20 ont la réponse 'A'
    useQuizStore.getState().selectAnswer('A');

    const { score } = useQuizStore.getState();
    expect(score).toBe(1);
  });

  it("ne modifie pas le score si la réponse est incorrecte", () => {
    useQuizStore.getState().startQuiz(pool20);
    useQuizStore.getState().selectAnswer('B'); // 'B' est une mauvaise réponse

    const { score } = useQuizStore.getState();
    expect(score).toBe(0);
  });

  it('enregistre la réponse sélectionnée dans selectedAnswer', () => {
    useQuizStore.getState().startQuiz(pool20);
    useQuizStore.getState().selectAnswer('C');

    const { selectedAnswer } = useQuizStore.getState();
    expect(selectedAnswer).toBe('C');
  });

  it('ignore une 2ème sélection (anti-triche)', () => {
    useQuizStore.getState().startQuiz(pool20);

    // Première réponse incorrecte, puis tentative de changement
    useQuizStore.getState().selectAnswer('B'); // mauvaise
    useQuizStore.getState().selectAnswer('A'); // tentative de corriger — doit être ignorée

    const { score, selectedAnswer } = useQuizStore.getState();
    expect(score).toBe(0);          // le score ne change pas
    expect(selectedAnswer).toBe('B'); // la première réponse est conservée
  });

});

// ─── Suite 3 : nextQuestion ──────────────────────────────────────────────────

describe('nextQuestion', () => {

  it('passe à la question suivante (index + 1)', () => {
    useQuizStore.getState().startQuiz(pool20);
    useQuizStore.getState().selectAnswer('A');
    useQuizStore.getState().nextQuestion();

    const { currentIndex } = useQuizStore.getState();
    expect(currentIndex).toBe(1);
  });

  it('remet selectedAnswer à null après passage à la question suivante', () => {
    useQuizStore.getState().startQuiz(pool20);
    useQuizStore.getState().selectAnswer('A');
    useQuizStore.getState().nextQuestion();

    const { selectedAnswer } = useQuizStore.getState();
    expect(selectedAnswer).toBeNull();
  });

  it('garde le status "playing" tant qu\'on n\'est pas à la dernière question', () => {
    useQuizStore.getState().startQuiz(pool20);
    useQuizStore.getState().selectAnswer('A');
    useQuizStore.getState().nextQuestion(); // on passe à la question 2

    const { status } = useQuizStore.getState();
    expect(status).toBe('playing');
  });

  it('passe le status à "finished" après la dernière question', () => {
    // On utilise un pool de 2 questions pour simplifier
    const tinyPool = [makeQuestion('t1'), makeQuestion('t2')];
    useQuizStore.getState().startQuiz(tinyPool);

    // Question 1
    useQuizStore.getState().selectAnswer('A');
    useQuizStore.getState().nextQuestion();

    // Question 2 (dernière)
    useQuizStore.getState().selectAnswer('A');
    useQuizStore.getState().nextQuestion();

    const { status } = useQuizStore.getState();
    expect(status).toBe('finished');
  });

});

// ─── Suite 4 : resetQuiz ─────────────────────────────────────────────────────

describe('resetQuiz', () => {

  it('remet le quiz à zéro mais conserve catégorie et difficulté', () => {
    // Arrange : configurer catégorie + difficulté puis jouer
    useQuizStore.getState().setCategory('sciences');
    useQuizStore.getState().setDifficulty('hard');
    useQuizStore.getState().startQuiz(pool20);
    useQuizStore.getState().selectAnswer('A');

    // Act
    useQuizStore.getState().resetQuiz();

    // Assert
    const { status, score, currentIndex, questions, category, difficulty } = useQuizStore.getState();
    expect(status).toBe('idle');
    expect(score).toBe(0);
    expect(currentIndex).toBe(0);
    expect(questions).toHaveLength(0);
    // Catégorie et difficulté conservées pour le bouton "Rejouer"
    expect(category).toBe('sciences');
    expect(difficulty).toBe('hard');
  });

});

// ─── Suite 5 : resetAll ──────────────────────────────────────────────────────

describe('resetAll', () => {

  it('remet absolument tout à zéro y compris catégorie et difficulté', () => {
    // Arrange
    useQuizStore.getState().setCategory('histoire');
    useQuizStore.getState().setDifficulty('medium');
    useQuizStore.getState().startQuiz(pool20);

    // Act
    useQuizStore.getState().resetAll();

    // Assert
    const { status, score, currentIndex, questions, category, difficulty } = useQuizStore.getState();
    expect(status).toBe('idle');
    expect(score).toBe(0);
    expect(currentIndex).toBe(0);
    expect(questions).toHaveLength(0);
    expect(category).toBeNull();
    expect(difficulty).toBeNull();
  });

});
