// cypress/e2e/onboarding.cy.ts
//
// Tests E2E de l'écran d'onboarding.
// Vérifie : création de profil complète, validations du formulaire, redirection vers Home.
//
// Prérequis : l'app doit être lancée (npm run dev)

describe('Onboarding', () => {

  // Avant chaque test : localStorage vide → l'app affiche l'onboarding
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/fr');
  });

  // ── Flux complet ──────────────────────────────────────────────────────────

  it('permet de créer un profil complet et redirige vers Home', () => {
    // Saisir un pseudo valide (≥ 2 caractères)
    cy.get('[data-testid="pseudo-input"]').type('SuperHéros');

    // Choisir la tranche d'âge 6-9 ans
    cy.get('[data-testid="age-6-9"]').click();

    // Choisir le premier avatar (Milo)
    cy.get('[data-testid="avatar-Milo"]').click();

    // Le bouton confirmer doit être actif
    cy.get('[data-testid="confirm-btn"]').should('not.be.disabled').click();

    // On doit arriver sur /home
    cy.url().should('include', '/home');

    // Le pseudo doit être affiché dans la page d'accueil
    cy.contains('SuperHéros').should('be.visible');
  });

  // ── Validations du formulaire ──────────────────────────────────────────────

  it('CTA désactivé si tous les champs ne sont pas remplis', () => {
    // Aucun champ rempli → bouton désactivé
    cy.get('[data-testid="confirm-btn"]').should('be.disabled');
  });

  it('CTA désactivé si le pseudo est trop court (< 2 caractères)', () => {
    cy.get('[data-testid="pseudo-input"]').type('A');
    cy.get('[data-testid="age-6-9"]').click();
    cy.get('[data-testid="avatar-Milo"]').click();

    cy.get('[data-testid="confirm-btn"]').should('be.disabled');
  });

  it('CTA désactivé si la tranche d\'âge n\'est pas sélectionnée', () => {
    cy.get('[data-testid="pseudo-input"]').type('SuperHéros');
    // Pas de tranche d'âge sélectionnée
    cy.get('[data-testid="avatar-Milo"]').click();

    cy.get('[data-testid="confirm-btn"]').should('be.disabled');
  });

  it('CTA désactivé si aucun avatar n\'est sélectionné', () => {
    cy.get('[data-testid="pseudo-input"]').type('SuperHéros');
    cy.get('[data-testid="age-10-13"]').click();
    // Pas d'avatar sélectionné

    cy.get('[data-testid="confirm-btn"]').should('be.disabled');
  });

  // ── Sélection avatar ──────────────────────────────────────────────────────

  it('permet de sélectionner n\'importe quel avatar', () => {
    // Tester avec un autre avatar (Luna)
    cy.get('[data-testid="pseudo-input"]').type('Testeur');
    cy.get('[data-testid="age-6-9"]').click();
    cy.get('[data-testid="avatar-Luna"]').click();

    cy.get('[data-testid="confirm-btn"]').should('not.be.disabled').click();
    cy.url().should('include', '/home');
  });

});
