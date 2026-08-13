// jest.config.js
//
// Configuration principale de Jest pour Quizzly.
// Utilise ts-jest pour transpiler TypeScript sans build Next.js.
// L'environnement jsdom simule un navigateur (requis par Zustand pour localStorage).
//
// En .js plutôt qu'en .ts : Jest ne peut lire un jest.config.ts qu'en
// installant `ts-node`, absent des devDependencies du projet. Le fichier
// n'a aucun besoin de typage — le convertir évite une dépendance de plus
// (cf. context/coding-standards.md : éviter les dépendances superflues).

/** @type {import('jest').Config} */
const config = {
  // ts-jest : transpile les fichiers TypeScript à la volée
  preset: 'ts-jest',

  // jsdom : simule window, localStorage, document dans Node.js
  testEnvironment: 'jest-environment-jsdom',

  // Utilise ts-jest pour transpiler TypeScript avec la config Jest dédiée
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.jest.json' }],
  },

  // Résolution de l'alias @/* → src/* (comme dans tsconfig.json paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Fichiers de tests reconnus
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],

  // Réinitialise les mocks entre chaque test automatiquement
  clearMocks: true,
};

module.exports = config;
