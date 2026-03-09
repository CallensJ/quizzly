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
      /** Répond à toutes les questions du quiz en cliquant sur A + Suivant */
      answerAllQuestions(): Chainable<void>;
    }
  }
}
