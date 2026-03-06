/**
 * src/i18n/navigation.ts
 *
 * Helpers de navigation locale-aware fournis par next-intl.
 * Exporte Link, redirect, useRouter et usePathname pré-configurés
 * avec les locales du projet (fr/en).
 *
 * Usage dans les composants :
 *   import { useRouter, usePathname } from '@/i18n/navigation';
 *   router.replace(pathname, { locale: 'fr' });  // change la langue sans changer la route
 */

import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, useRouter, usePathname } = createNavigation(routing);
