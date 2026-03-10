// cypress/e2e/quiz-flow.cy.ts
//
// Tests E2E du flux quiz complet : Home → Quiz → Results.
// Un profil est injecté directement en localStorage (cy.setupProfile)
// pour ne pas dépendre de l'onboarding dans ces tests.
//
// Prérequis : l'app doit être lancée (npm run dev)

describe('Flux Home → Quiz → Results', () => {

  // Avant chaque test : profil existant + cache questions mock → on atterrit sur Home
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.setupProfile();
    // Pré-remplit le cache questions pour éviter les appels Supabase en CI
    cy.setupQuestionsCache();
    // Recharger après injection du localStorage pour que Zustand le lise
    cy.visit('/fr/home');
  });

  // ── Écran Home ────────────────────────────────────────────────────────────

  it('bouton Play désactivé si catégorie ou difficulté manquante', () => {
    // Rien sélectionné
    cy.get('[data-testid="play-btn"]').should('be.disabled');

    // Seulement catégorie
    cy.get('[data-testid="cat-sciences"]').click();
    cy.get('[data-testid="play-btn"]').should('be.disabled');

    // Catégorie + difficulté → bouton actif
    cy.get('[data-testid="diff-easy"]').click();
    cy.get('[data-testid="play-btn"]').should('not.be.disabled');
  });

  // ── Flux complet ──────────────────────────────────────────────────────────

  it('lance un quiz Sciences Easy et affiche les résultats', () => {
    // Sélection catégorie + difficulté
    cy.get('[data-testid="cat-sciences"]').click();
    cy.get('[data-testid="diff-easy"]').click();

    // Lancer le quiz
    cy.get('[data-testid="play-btn"]').click();

    // On doit être sur /quiz
    cy.url().should('include', '/quiz');

    // Répondre à toutes les questions
    cy.answerAllQuestions();

    // On doit arriver sur /results
    cy.url().should('include', '/results');

    // Le score doit être visible (un nombre entre 0 et 20)
    cy.get('[data-testid="score-num"]')
      .invoke('text')
      .then((text) => {
        const score = parseInt(text, 10);
        expect(score).to.be.at.least(0);
        expect(score).to.be.at.most(20);
      });
  });

  it('lance un quiz Histoire Medium et affiche les résultats', () => {
    cy.get('[data-testid="cat-histoire"]').click();
    cy.get('[data-testid="diff-medium"]').click();
    cy.get('[data-testid="play-btn"]').click();

    cy.url().should('include', '/quiz');
    cy.answerAllQuestions();
    cy.url().should('include', '/results');

    cy.get('[data-testid="score-num"]').should('be.visible');
  });

  // ── Écran Results ─────────────────────────────────────────────────────────

  it('bouton Retour accueil ramène sur Home et remet le quiz à zéro', () => {
    cy.get('[data-testid="cat-sciences"]').click();
    cy.get('[data-testid="diff-easy"]').click();
    cy.get('[data-testid="play-btn"]').click();

    cy.answerAllQuestions();
    cy.url().should('include', '/results');

    // Cliquer sur Retour accueil
    cy.get('[data-testid="home-btn"]').click();
    cy.url().should('include', '/home');

    // Le bouton Play doit être désactivé (catégorie + difficulté réinitialisées)
    cy.get('[data-testid="play-btn"]').should('be.disabled');
  });

  it('bouton Rejouer relance le quiz avec la même catégorie et difficulté', () => {
    // diff-easy : fr/sciences n'a que des questions easy (pas de medium/hard)
    cy.get('[data-testid="cat-sciences"]').click();
    cy.get('[data-testid="diff-easy"]').click();
    cy.get('[data-testid="play-btn"]').click();

    cy.answerAllQuestions();
    cy.url().should('include', '/results');

    // Cliquer sur Rejouer
    cy.get('[data-testid="play-again-btn"]').click();

    // On doit être de retour sur /quiz
    cy.url().should('include', '/quiz');

    // La première question doit être visible
    cy.get('[data-testid="answer-A"]').should('be.visible');
  });

});
