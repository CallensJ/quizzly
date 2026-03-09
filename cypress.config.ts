// cypress.config.ts
//
// Configuration principale de Cypress pour les tests E2E de Quizzly.
// L'app doit être lancée (npm run dev) avant d'exécuter les tests.

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // URL de base — next.js dev server
    baseUrl: 'http://localhost:3000',

    // Dossier des tests E2E
    specPattern: 'cypress/e2e/**/*.cy.ts',

    // Désactivé : les vidéos ralentissent les runs en local
    video: false,

    // Timeout par défaut pour les assertions (ms)
    // Augmenté car DiceBear + next-intl peuvent être lents au premier render
    defaultCommandTimeout: 10000,

    // Timeout pour les changements d'URL (navigations entre pages)
    pageLoadTimeout: 30000,

    setupNodeEvents() {
      // Aucun plugin Node nécessaire pour MVP 2
    },
  },
});
