/**
 * cypress/e2e/pwa.cy.ts
 *
 * Tests E2E du mode PWA / Service Worker.
 *
 * ⚠️  OBLIGATOIRE : build de production avant de lancer ces tests !
 *     npm run build && npm run start
 *     Le SW est désactivé en développement (npm run dev).
 *     En CI, le job cypress-e2e fait automatiquement le build prod.
 *
 * Ce qu'on vérifie :
 *   1. Le Service Worker est enregistré et actif
 *   2. Les caches Workbox sont créés après navigation
 *   3. Les assets statiques Next.js sont en cache
 *   4. La page /fr/offline existe et s'affiche
 *   5. En mode offline, les pages déjà visitées restent accessibles
 *   6. En mode offline, les pages non visitées tombent sur /offline
 */

// ─── Helpers CDP (Chrome DevTools Protocol) ──────────────────────────────────

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

// ─── Détection mode prod ─────────────────────────────────────────────────────
// Les tests SW ne passent qu'en prod. On skip proprement si aucun SW n'est enregistré
// pour éviter des faux négatifs quand quelqu'un lance Cypress contre le dev server.

function assertProductionBuild() {
  cy.window({ timeout: 5000 }).then((win) => {
    if (!('serviceWorker' in win.navigator)) {
      throw new Error(
        'Service Worker API absente — lancer Chrome avec les bonnes flags'
      );
    }
    return cy.wrap(win.navigator.serviceWorker.getRegistrations(), { timeout: 10000 });
  }).then((regs) => {
    if ((regs as ServiceWorkerRegistration[]).length === 0) {
      throw new Error(
        'Aucun Service Worker enregistré.\n' +
        '⚠️  Ces tests nécessitent un BUILD DE PRODUCTION :\n' +
        '    npm run build && npm run start\n' +
        '    puis npx cypress run (ou open)'
      );
    }
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PWA — Service Worker', () => {
  afterEach(() => {
    goOnline();
  });

  it('enregistre un Service Worker actif', () => {
    cy.visit('/fr/home');
    // Le SW s'installe au premier chargement — on attend qu'il soit prêt
    cy.wait(3000);

    cy.window().then((win) => {
      return cy.wrap(win.navigator.serviceWorker.getRegistrations(), { timeout: 15000 });
    }).then((registrations) => {
      const regs = registrations as ServiceWorkerRegistration[];
      expect(regs.length, 'Au moins 1 SW enregistré (lancer en mode prod !)').to.be.greaterThan(0);

      const sw = regs[0];
      const worker = sw.active ?? sw.installing ?? sw.waiting;
      expect(worker, 'Le SW doit être active, installing ou waiting').to.exist;
    });
  });

  it('crée les caches Workbox attendus après navigation', () => {
    cy.visit('/fr/home');
    cy.wait(4000);

    assertProductionBuild();

    cy.window().then((win) => {
      return cy.wrap(win.caches.keys(), { timeout: 10000 });
    }).then((cacheNames) => {
      const names = cacheNames as string[];
      EXPECTED_CACHES.forEach((expected) => {
        const found = names.some((name) => name.includes(expected));
        expect(found, `Cache "${expected}" attendu — présents : ${names.join(', ')}`).to.be.true;
      });
    });
  });

  it('met en cache les assets statiques Next.js (_next/static)', () => {
    cy.visit('/fr/home');
    cy.wait(4000);

    assertProductionBuild();

    cy.window().then((win) => {
      return cy.wrap(win.caches.keys(), { timeout: 10000 });
    }).then((cacheNames) => {
      const names = cacheNames as string[];
      const staticCacheName = names.find((k) => k.includes('next-static-assets'));
      expect(staticCacheName, 'Cache next-static-assets doit exister').to.exist;
      return cy.wrap(staticCacheName as string);
    }).then((cacheName) => {
      cy.window().then((win) => {
        return cy.wrap(
          win.caches.open(cacheName as string).then((c) => c.keys()),
          { timeout: 10000 }
        );
      }).then((keys) => {
        const requests = keys as Request[];
        expect(requests.length).to.be.greaterThan(0);
        const hasJsBundle = requests.some((req) => req.url.includes('/_next/static/'));
        expect(hasJsBundle, 'Au moins un bundle JS Next.js en cache').to.be.true;
      });
    });
  });

  it('met en cache les pages visitées', () => {
    cy.visit('/fr/home');
    cy.wait(4000);

    assertProductionBuild();

    cy.window().then((win) => {
      return cy.wrap(win.caches.keys(), { timeout: 10000 });
    }).then((cacheNames) => {
      const names = cacheNames as string[];
      const pagesCacheName = names.find((k) => k.includes('pages'));
      if (!pagesCacheName) return;

      cy.window().then((win) => {
        return cy.wrap(
          win.caches.open(pagesCacheName).then((c) => c.keys()),
          { timeout: 10000 }
        );
      }).then((keys) => {
        expect((keys as Request[]).length).to.be.greaterThan(0);
      });
    });
  });
});

describe('PWA — Page offline', () => {
  // Ignore les erreurs applicatives Next.js (ChunkLoadError en offline, etc.)
  beforeEach(() => {
    cy.on('uncaught:exception', () => false);
  });

  it('affiche la page /fr/offline avec le bon contenu', () => {
    cy.visit('/fr/offline');

    cy.contains('Oups, pas de connexion !').should('be.visible');
    cy.contains('Réessayer').should('be.visible');
  });

  it('redirige vers / quand on revient en ligne depuis /fr/offline', () => {
    cy.visit('/fr/offline');

    // Simuler le retour de connexion
    cy.window().then((win) => {
      // Forcer navigator.onLine à true avant de déclencher l'événement
      Object.defineProperty(win.navigator, 'onLine', { value: true, writable: true });
      win.dispatchEvent(new Event('online'));
    });

    // L'app redirige avec un délai de 1500ms
    cy.url({ timeout: 5000 }).should('not.include', '/offline');
  });
});

describe('PWA — Mode offline (CDP)', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false);
  });

  afterEach(() => {
    goOnline();
  });

  it('sert /fr/home depuis le cache quand le réseau est coupé', () => {
    // 1. Peupler le cache
    cy.visit('/fr/home');
    cy.wait(4000);

    assertProductionBuild();

    // 2. Couper le réseau
    goOffline();

    // 3. Recharger — le SW sert depuis le cache
    cy.reload();

    // 4. La page doit s'afficher (pas la page d'erreur navigateur)
    cy.get('body').should('be.visible');
    cy.url().should('not.include', '/offline');
  });

  it('affiche /offline pour une page jamais visitée quand offline', () => {
    // 1. Installer le SW
    cy.visit('/fr/home');
    cy.wait(4000);

    assertProductionBuild();

    // 2. Couper le réseau
    goOffline();

    // 3. Naviguer vers une page non cachée
    cy.visit('/fr/stats', { failOnStatusCode: false });

    // 4. Le SW sert la page offline en fallback
    cy.contains('Oups, pas de connexion !', { timeout: 10000 }).should('be.visible');
  });
});
