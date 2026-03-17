// cypress/support/commands.ts
//
// Commandes Cypress personnalisées pour Erudia.
// Ces commandes sont disponibles via cy.xxx() dans tous les tests.

/// <reference types="cypress" />

/**
 * cy.setupProfile()
 *
 * Injecte un profil utilisateur directement en localStorage avant de visiter l'app.
 * Permet de sauter l'onboarding dans les tests qui n'ont pas besoin de le tester.
 *
 * Format : structure persistée par Zustand (clé "erudia-profile").
 */
Cypress.Commands.add('setupProfile', () => {
  // On doit d'abord visiter l'app pour que localStorage soit disponible sur le bon origin
  cy.visit('/fr');
  cy.window().then((win) => {
    win.localStorage.setItem(
      'erudia-profile',
      JSON.stringify({
        state: {
          profile: {
            pseudo: 'TestPlayer',
            avatarId: 'Milo',
            badgeEarned: false,
            locale: 'fr',
            createdAt: new Date().toISOString(),
          },
          sessions: [],
          deviceId: 'test-device-id',
          timerEnabled: false,
          soundEnabled: false, // sons désactivés pour ne pas bloquer les tests
          adminPin: null,
          adminEmail: null,
          dailyGoal: null,
          multiplayerUnlocked: false,
          reportSchedule: 'none',
          earnedBadgeIds: [],
          dailyStreak: 0,
          dailyLastDate: null,
          dailyXp: 0,
          dailyShields: 0,
          dailyTodayScore: null,
        },
        version: 0,
      })
    );
  });
});

/**
 * cy.setupQuestionsCache()
 *
 * Pré-remplit le cache localStorage des questions (clé `erudia-q-{cat}-fr`)
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
        `erudia-q-${category}-fr`,
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
 * Utilise 25 itérations (marge de sécurité) avec $body.find() pour détecter
 * la présence de answer-A SANS timeout bloquant.
 *
 * Pourquoi $body.find() plutôt que cy.url() + cy.get({timeout}) ?
 * Après la dernière question (question 20), nextQuestion() met status='finished'.
 * QuizScreen rend null (plus de answer-A dans le DOM). Mais l'URL est encore '/quiz'
 * pendant quelques ms avant que l'effet router.push('/results') ne fire.
 * Avec cy.url() + cy.get({timeout:10000}), l'itération 21 voyait '/quiz', cherchait
 * answer-A pendant 10s et échouait. Avec $body.find(), le check est instantané :
 * si answer-A n'est pas dans le DOM → skip immédiat.
 *
 * Note : on répond toujours A — l'objectif est de tester le flux, pas les questions.
 */
Cypress.Commands.add('answerAllQuestions', () => {
  // 25 itérations — marge de sécurité au-delà des 20 questions
  Cypress._.times(25, () => {
    cy.get('body').then(($body) => {
      // Check synchrone sans timeout : si answer-A n'est pas visible (quiz fini
      // ou en transition), on skipe cette itération sans bloquer.
      if ($body.find('[data-testid="answer-A"]').is(':visible')) {
        cy.get('[data-testid="answer-A"]').click();
        cy.get('[data-testid="next-btn"]', { timeout: 10000 }).should('be.visible').should('not.be.disabled').click();
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
