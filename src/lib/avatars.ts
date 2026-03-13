/**
 * src/lib/avatars.ts
 *
 * Configuration centralisée des avatars DiceBear.
 * Distingue les avatars gratuits (style adventurer, 8 seeds) des styles premium
 * verrouillés (fun-emoji, bottts, pixel-art, micah).
 *
 * Le déverrouillage des styles premium est conditionné à un abonnement Stripe (MVP 4).
 * En attendant, ils sont affichés en UI avec un indicateur de verrouillage.
 *
 * Rétro-compatibilité : les profils sans avatarStyle défini utilisent 'adventurer' par défaut.
 */

export type AvatarStyle = 'adventurer' | 'fun-emoji' | 'bottts' | 'pixel-art' | 'micah';

// Fonds pastel — palette unifiée sur tous les styles pour cohérence visuelle
export const BG_COLORS = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';

// ─── Version gratuite ──────────────────────────────────────────────────────────

export const FREE_STYLE: AvatarStyle = 'adventurer';

// 8 seeds prédéfinis — accès sans abonnement
export const FREE_SEEDS = ['Milo', 'Zara', 'Felix', 'Luna', 'Sam', 'Ava', 'Kai', 'Lily'];

// ─── Styles premium verrouillés ───────────────────────────────────────────────
// Débloqués avec un abonnement (Stripe — MVP 4).
// 4 seeds affichés en aperçu dans la galerie (sur 8 disponibles au total).

export const PREMIUM_STYLES: { style: AvatarStyle; label: string; seeds: string[] }[] = [
  {
    style: 'fun-emoji',
    label: '😄 Emojis',
    seeds: ['Happy', 'Cool', 'Star', 'Fire', 'Rainbow', 'Rocket', 'Dragon', 'Ninja'],
  },
  {
    style: 'bottts',
    label: '🤖 Robots',
    seeds: ['Robo', 'Pixel', 'Spark', 'Bolt', 'Gizmo', 'Chip', 'Circuit', 'Blip'],
  },
  {
    style: 'pixel-art',
    label: '🎮 Pixel Art',
    seeds: ['Hero', 'Wizard', 'Knight', 'Pirate', 'Ninja', 'Elf', 'Viking', 'Mage'],
  },
  {
    style: 'micah',
    label: '🎨 Portraits',
    seeds: ['Alex', 'Jamie', 'Quinn', 'River', 'Sage', 'Rowan', 'Blair', 'Avery'],
  },
];

// ─── Utilitaire URL DiceBear ──────────────────────────────────────────────────

/**
 * Construit l'URL DiceBear pour un avatar.
 * @param seed  - Identifiant de la seed (ex: "Milo", "Happy")
 * @param style - Style DiceBear (défaut: "adventurer" pour rétro-compatibilité)
 */
export function buildAvatarUrl(seed: string, style: AvatarStyle = FREE_STYLE): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${BG_COLORS}`;
}
