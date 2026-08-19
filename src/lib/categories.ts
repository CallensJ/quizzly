/**
 * src/lib/categories.ts
 *
 * Source unique de vérité pour les couleurs et emoji des 5 catégories v1.4.
 * Synchronisé avec les variables SCSS de _variables.scss.
 * Utilisé par QuizScreen, AppLayout (sidebar), HomeScreen, ResultsScreen.
 */

import type { Category } from '@/types';

// Couleurs par catégorie — correspondent aux tokens CSS --color-cat-*
const CATEGORY_COLORS: Record<Category, string> = {
  'histoire-du-monde': '#795548',
  'culture-generale':  '#FF9800',
  'sciences-nature':   '#4CAF50',
  dinosaures:          '#8D6E63',
  espace:              '#3F51B5',
};

/** Emoji par catégorie — source unique de vérité pour QuizScreen, ResultsScreen, etc. */
export const CATEGORY_EMOJI: Record<Category, string> = {
  'histoire-du-monde': '📜',
  'culture-generale':  '💡',
  'sciences-nature':   '🔬',
  dinosaures:          '🦖',
  espace:              '🚀',
};

/** Retourne la couleur hex d'une catégorie, ou le primary (#667eea) par défaut. */
export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return '#667eea';
  return CATEGORY_COLORS[category as Category] ?? '#667eea';
}

/**
 * Mélange une couleur hex avec du noir (équivalent JS de color-mix(in srgb, color 68%, #000)).
 * Évite d'imbriquer var() dans color-mix() en CSS, ce qui peut être instable selon les navigateurs.
 */
function mixWithBlack(hex: string, ratio: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * ratio);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * ratio);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * ratio);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Retourne la variante sombre (×0.68) d'une couleur de catégorie — pour les fins de gradient. */
export function getCategoryColorDark(category: string | null | undefined): string {
  return mixWithBlack(getCategoryColor(category), 0.68);
}
