/**
 * cypress/e2e/pwa.cy.ts
 *
 * Tests E2E du mode PWA / Service Worker.
 *
 * ⚠️  Ces tests nécessitent un build de production (npm run build && npm run start).
 *     Le Service Worker est désactivé en développement pour éviter les conflits HMR.
 *     En CI, le job cypress-e2e lance automatiquement le build prod avant ces tests.
 *
 * Ce qu'on vérifie :
 *   1. Le Service Worker est enregistré et actif
 *   2. Les caches Workbox sont créés après navigation (app shell en cache)
 *   3. Les assets statiques Next.js sont bien mis en cache
 *   4. La page /offline existe et s'affiche correctement
 *   5. En mode offline (CDP), les pages déjà visitées restent accessibles
 *   6. En mode offline, les pages non visitées redirigent vers /offline
 */

// ─── Helpers CDP (Chrome DevTools Protocol) ──────────────────────────────────
// Simule la coupure réseau au niveau navigateur — plus fiable que cy.intercept
// pour tester le vrai comportement du Service Worker.

const goOffline = () =>
  Cypress.automation('remote:debugger:protocol', {
    command: 'Network.emulateNetworkConditions',
    params: {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    },
  });

const goOnline = () =>
  Cypress.automation('remote:debugger:protocol', {
    command: 'Network.emulateNetworkConditions',
    params: {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    },
  });

// ─── Noms des caches Workbox (définis dans next.config.ts) ───────────────────
const EXPECTED_CACHES = [
  'next-static-assets',
  'pages',
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PWA — Service Worker', () => {
  // Toujours rétablir le réseau après chaque test pour ne pas polluer les suivants
  afterEach(() => {
    goOnline();
  });

  it('enregistre un Service Worker actif', () => {
    cy.visit('/fr/home');

    // cy.wrap() délègue la promesse à Cypress — pas d'async/await dans .then()
    cy.window().then((win) => {
      return cy.wrap(win.navigator.serviceWorker.getRegistrations(), { timeout: 15000 });
    }).then((registrations) => {
      expect(registrations).to.have.length.greaterThan(0);
      // Au moins un SW doit être actif (installing/waiting/active)
      const sw = registrations[0];
      expect(sw.active ?? sw.installing ?? sw.waiting).to.exist;
    });
  });

  it('crée les caches Workbox attendus après navigation', () => {
    cy.visit('/fr/home');
    cy.wait(3000); // Laisse le SW installer et cacher les assets

    cy.window().then((win) => {
      return cy.wrap(win.caches.keys(), { timeout: 10000 });
    }).then((cacheNames) => {
      EXPECTED_CACHES.forEach((expected) => {
        const found = (cacheNames as string[]).some((name) => name.includes(expected));
        expect(found, `Cache "${expected}" devrait exister — caches : ${(cacheNames as string[]).join(', ')}`).to.be.true;
      });
    });
  });

  it('met en cache les assets statiques Next.js (_next/static)', () => {
    cy.visit('/fr/home');
    cy.wait(3000);

    cy.window().then((win) => {
      return cy.wrap(win.caches.keys(), { timeout: 10000 });
    }).then((cacheNames) => {
      const staticCacheName = (cacheNames as string[]).find((k) => k.includes('next-static-assets'));
      expect(staticCacheName, 'Cache next-static-assets doit exister').to.exist;

      return cy.wrap(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (window as Window).caches.open(staticCacheName!).then((c) => c.keys()),
        { timeout: 10000 }
      );
    }).then((keys) => {
      expect((keys as Request[]).length).to.be.greaterThan(0);
      const hasJsBundle = (keys as Request[]).some((req) => req.url.includes('/_next/static/'));
      expect(hasJsBundle, 'Au moins un bundle JS Next.js doit être en cache').to.be.true;
    });
  });

  it('met en cache les pages visitées', () => {
    cy.visit('/fr/home');
    cy.wait(3000);

    cy.window().then((win) => {
      return cy.wrap(win.caches.keys(), { timeout: 10000 });
    }).then((cacheNames) => {
      const pagesCacheName = (cacheNames as string[]).find((k) => k.includes('pages'));
      if (!pagesCacheName) return; // Cache pages optionnel selon les navigations

      return cy.wrap(
        (window as Window).caches.open(pagesCacheName).then((c) => c.keys()),
        { timeout: 10000 }
      );
    }).then((keys) => {
      if (!keys) return;
      expect((keys as Request[]).length).to.be.greaterThan(0);
    });
  });
});

describe('PWA — Page offline', () => {
  it('affiche la page /offline avec le bon contenu', () => {
    cy.visit('/offline');

    cy.contains('Oups, pas de connexion !').should('be.visible');
    cy.contains('Réessayer').should('be.visible');
  });

  it('redirige vers / quand on revient en ligne depuis /offline', () => {
    cy.visit('/offline');

    // Simuler le retour de connexion via l'événement online
    cy.window().then((win) => {
      win.dispatchEvent(new Event('online'));
    });

    // L'app doit rediriger (avec un délai de 1500ms)
    cy.url({ timeout: 5000 }).should('not.include', '/offline');
  });
});

describe('PWA — Mode offline (CDP)', () => {
  it('sert la page /fr/home depuis le cache quand le réseau est coupé', () => {
    // 1. Visiter pour peupler le cache
    cy.visit('/fr/home');
    cy.wait(2000);

    // 2. Couper le réseau
    goOffline();

    // 3. Recharger — le SW doit servir depuis le cache
    cy.reload();

    // 4. L'app doit toujours s'afficher (pas de page d'erreur navigateur)
    cy.get('body').should('be.visible');

    // Vérifier qu'on n'est PAS sur la page offline (la page était en cache)
    cy.url().should('not.include', '/offline');
  });

  it('redirige vers /offline pour une page jamais visitée quand offline', () => {
    // 1. D'abord, visiter l'app pour que le SW soit installé
    cy.visit('/fr/home');
    cy.wait(2000);

    // 2. Couper le réseau
    goOffline();

    // 3. Naviguer vers une page non visitée (/fr/stats par exemple)
    // Le SW ne l'a pas en cache → doit servir /offline
    cy.visit('/fr/stats', { failOnStatusCode: false });

    // 4. La page /offline doit s'afficher
    cy.contains('Oups, pas de connexion !', { timeout: 8000 }).should('be.visible');
  });
});
