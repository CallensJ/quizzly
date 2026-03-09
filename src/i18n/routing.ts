// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
});

// Type dérivé de la config — évite de dupliquer la liste des locales
export type Locale = (typeof routing.locales)[number];
