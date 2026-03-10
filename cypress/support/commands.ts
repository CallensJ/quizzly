// cypress/support/commands.ts
//
// Commandes Cypress personnalisées pour Quizzly.
// Ces commandes sont disponibles via cy.xxx() dans tous les tests.

/// <reference types="cypress" />

/**
 * cy.setupProfile()
 *
 * Injecte un profil utilisateur directement en localStorage avant de visiter l'app.
 * Permet de sauter l'onboarding dans les tests qui n'ont pas besoin de le tester.
 *
 * Format : structure persistée par Zustand (clé "quizzly-profile").
 */
Cypress.Commands.add('setupProfile', () => {
  // On doit d'abord visiter l'app pour que localStorage soit disponible sur le bon origin
  cy.visit('/fr');
  cy.window().then((win) => {
    win.localStorage.setItem(
      'quizzly-profile',
      JSON.stringify({
        state: {
          profile: {
            pseudo: 'TestPlayer',
            ageGroup: '6-9',
            avatarId: 'Milo',
            badgeEarned: false,
            locale: 'fr',
            createdAt: new Date().toISOString(),
          },
          sessions: [],
          timerEnabled: false,
          soundEnabled: false, // sons désactivés pour ne pas bloquer les tests
          adminPin: null,
          dailyGoal: null,
        },
        version: 0,
      })
    );
  });
});

/**
 * cy.setupQuestionsCache()
 *
 * Pré-remplit le cache localStorage des questions (clé `quizzly-q-{cat}-fr`)
 * avec des données mock pour toutes les catégories et difficultés.
 *
 * Nécessaire depuis que fetchQuestions() interroge Supabase : en CI il n'y a
 * pas d'appel réseau réel, le cache évite l'erreur "fetchError" qui bloque
 * la navigation vers /quiz.
 *
 * Doit être appelé après cy.setupProfile() (même visit → même origin).
 */
Cypress.Commands.add('setupQuestionsCache', () => {
  cy.window().then((win) => {
    // Génère N questions mock pour une catégorie + difficulté
    const makeQuestions = (category: string, difficulty: string, count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `${category}-${difficulty}-${i + 1}`,
        difficulty,
        question: `Question test ${i + 1} (${category} — ${difficulty}) ?`,
        options: { A: 'Réponse A', B: 'Réponse B', C: 'Réponse C', D: 'Réponse D' },
        answer: 'A',
      }));

    // 25 questions par difficulté → couvre un quiz de 20 questions avec marge
    const categories = ['sciences', 'histoire', 'heroes'];
    const difficulties = ['easy', 'medium', 'hard'];

    categories.forEach((category) => {
      const questions = difficulties.flatMap((diff) => makeQuestions(category, diff, 25));
      win.localStorage.setItem(
        `quizzly-q-${category}-fr`,
        JSON.stringify({ questions, cachedAt: Date.now() })
      );
    });
  });
});

/**
 * cy.answerAllQuestions()
 *
 * Répond à toutes les questions du quiz en cours en cliquant sur la réponse A,
 * puis en cliquant sur "Suivant" / "Terminer".
 *
 * Utilise Cypress._.times(20) plutôt que la récursion — plus stable en CI.
 * Chaque itération vérifie l'URL : si on est encore sur /quiz, on répond.
 * Sur la dernière question, next-btn navigue vers /results → les itérations
 * suivantes voient l'URL /results et passent sans cliquer (guard cy.url check).
 *
 * Note : on répond toujours A — l'objectif est de tester le flux, pas les questions.
 */
Cypress.Commands.add('answerAllQuestions', () => {
  // 20 itérations max — une par question (le quiz comporte 20 questions)
  Cypress._.times(20, () => {
    cy.url().then((url) => {
      if (url.includes('/quiz')) {
        cy.get('[data-testid="answer-A"]').click();
        cy.get('[data-testid="next-btn"]').click();
      }
    });
  });
});

// ─── Déclaration TypeScript des commandes personnalisées ──────────────────────
// Permet l'autocomplétion dans les fichiers de test.

// Le namespace global est nécessaire pour augmenter les types Cypress — pattern officiel TypeScript.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Injecte un profil en localStorage et recharge la page */
      setupProfile(): Chainable<void>;
      /** Pré-remplit le cache localStorage des questions (mock) pour éviter les appels Supabase en test */
      setupQuestionsCache(): Chainable<void>;
      /** Répond à toutes les questions du quiz en cliquant sur A + Suivant */
      answerAllQuestions(): Chainable<void>;
    }
  }
}
