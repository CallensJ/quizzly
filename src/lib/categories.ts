/**
 * src/lib/categories.ts
 *
 * Source unique de vérité pour les couleurs de catégorie.
 * Synchronisé avec les variables SCSS de _variables.scss.
 * Utilisé par QuizScreen, AppLayout (sidebar) et StatsScreen.
 */

// Couleurs par catégorie — correspondent aux tokens CSS --color-cat-*
const CATEGORY_COLORS: Record<string, string> = {
  sciences:    '#2196F3',
  histoire:    '#795548',
  heroes:      '#E91E63',
  sport:       '#4CAF50',
  geographie:  '#00BCD4',
  art:         '#FF5722',
  culturePop:  '#FF4081',
  civique:     '#607D8B',
  math:        '#FF5252',
  cuisine:     '#FF7043',
  technologie: '#00ACC1',
  mythologie:  '#7B1FA2',
  espace:      '#3F51B5',
  francais:    '#1565C0',
  anglais:     '#0288D1',
  animaux:     '#8BC34A',
  corps:       '#26A69A',
  musique:     '#AB47BC',
  enviro:      '#2E7D32',
  dino:        '#6D4C41',
};

/** Emoji par catégorie — source unique de vérité pour QuizScreen, ResultsScreen, etc. */
export const CATEGORY_EMOJI: Record<string, string> = {
  sciences:           '🔬',
  histoire:           '📜',
  heroes:             '⚔️',
  geographie:         '🌍',
  sport:              '🏆',
  math:               '🔢',
  francais:           '📖',
  anglais:            '🇬🇧',
  'animaux-nature':   '🐾',
  art:                '🎨',
  cuisine:            '🍳',
  'corps-humain':     '❤️',
  environnement:      '🌿',
  dinosaures:         '🦕',
  'espace-astronomie':'🚀',
  'pop-culture':      '🎬',
  technologie:        '💻',
  musique:            '🎵',
  'education-civique':'⚖️',
  mythology:          '✨',
};

/** Retourne la couleur hex d'une catégorie, ou le primary (#667eea) par défaut. */
export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return '#667eea';
  return CATEGORY_COLORS[category] ?? '#667eea';
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
