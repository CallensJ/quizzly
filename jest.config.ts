// jest.config.ts
//
// Configuration principale de Jest pour Quizzly.
// Utilise ts-jest pour transpiler TypeScript sans build Next.js.
// L'environnement jsdom simule un navigateur (requis par Zustand pour localStorage).

import type { Config } from 'jest';

const config: Config = {
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

export default config;
