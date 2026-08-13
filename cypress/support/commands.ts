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
          earnedBadgeIds: [],
          dailyStreak: 0,
          dailyLastDate: null,
        },
        version: 0,
      })
    );
  });
});

/**
 * cy.setupQuestionsCache()
 *
 * Pré-remplit le cache IndexedDB des questions (base `erudia-db`, table `questionCache`)
 * avec des données mock pour toutes les catégories et difficultés.
 *
 * Nécessaire depuis que fetchQuestions() interroge Supabase : en CI il n'y a
 * pas d'appel réseau réel, le cache évite l'erreur "fetchError" qui bloque
 * la navigation vers /quiz.
 *
 * IMPORTANT : l'app utilise Dexie/IndexedDB (src/lib/db.ts) — l'ancienne approche
 * localStorage était inopérante car fetchQuestions() ne lit pas localStorage.
 *
 * Doit être appelé après cy.setupProfile() (même visit → même origin).
 */
Cypress.Commands.add('setupQuestionsCache', () => {
  cy.window().then((win) => {
    return new Cypress.Promise<void>((resolve, reject) => {
      // Génère N questions mock pour une catégorie + difficulté
      const makeQuestions = (category: string, difficulty: string, count: number) =>
        Array.from({ length: count }, (_, i) => ({
          id: `${category}-${difficulty}-${i + 1}`,
          difficulty,
          question: `Question test ${i + 1} (${category} — ${difficulty}) ?`,
          options: { A: 'Réponse A', B: 'Réponse B', C: 'Réponse C', D: 'Réponse D' },
          answer: 'A',
        }));

      const categories = ['sciences', 'histoire', 'heroes'];
      const difficulties = ['easy', 'medium', 'hard'];

      // Ouvre (ou crée) la base Dexie — version 1, même schéma que src/lib/db.ts
      const dbRequest = win.indexedDB.open('erudia-db', 1);

      dbRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('questionCache')) {
          db.createObjectStore('questionCache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('pendingSyncs')) {
          db.createObjectStore('pendingSyncs', { autoIncrement: true });
        }
      };

      dbRequest.onerror = () => reject(dbRequest.error);

      dbRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = db.transaction('questionCache', 'readwrite');
        const store = tx.objectStore('questionCache');

        // 25 questions par difficulté → couvre un quiz de 20 questions avec marge
        categories.forEach((category) => {
          const questions = difficulties.flatMap((diff) => makeQuestions(category, diff, 25));
          store.put({
            key: `erudia-q-${category}-fr`,
            questions,
            cachedAt: Date.now(),
          });
        });

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
});

/**
 * cy.answerAllQuestions()
 *
 * Répond à toutes les questions du quiz en cours :
 *   1. Clique sur la réponse A
 *   2. Attend que le bouton "Suivant" devienne cliquable (après 800ms min)
 *   3. Clique sur "Suivant"
 *   4. Répète jusqu'à la fin du quiz (max 25 itérations)
 *
 * Le bouton Suivant (data-testid="next-btn") est présent dans le DOM dès qu'une
 * réponse est donnée, mais disabled et opacity:0 pendant 800ms. On attend qu'il
 * soit enabled avant de cliquer — cy.get(:not([disabled])) y suffit.
 *
 * Après la dernière question, QuizScreen rend null (plus d'answer-A dans le DOM)
 * et navigue vers /results. On utilise $body.find() (check synchrone sans timeout)
 * pour détecter proprement la fin sans bloquer.
 */
Cypress.Commands.add('answerAllQuestions', () => {
  // 25 itérations — marge de sécurité au-delà des 20 questions
  Cypress._.times(25, () => {
    cy.get('body').then(($body) => {
      // Check synchrone sans timeout : si answer-A n'est pas visible → quiz terminé, skip.
      if ($body.find('[data-testid="answer-A"]').is(':visible')) {
        cy.get('[data-testid="answer-A"]').click();
        // Attendre que le bouton Suivant soit activé (800ms min selon QuizScreen)
        cy.get('[data-testid="next-btn"]:not([disabled])', { timeout: 3000 }).click();
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
      /** Répond à toutes les questions du quiz : clique A puis le bouton Suivant */
      answerAllQuestions(): Chainable<void>;
    }
  }
}
