'use client';

/**
 * src/components/features/profile/BadgeTile.tsx
 *
 * Tuile individuelle d'un badge — utilisée dans BadgeGroupAccordion.
 * Deux états visuels : earned (doré, emoji) et locked (gris, cadenas).
 */

interface BadgeTileProps {
  emoji: string;
  name: string;
  desc: string;
  earned: boolean;
}

export default function BadgeTile({ emoji, name, desc, earned }: BadgeTileProps) {
  return (
    <div
      className={`badge-tile${earned ? ' badge-tile--earned' : ' badge-tile--locked'}`}
      title={desc}
      aria-label={`${name} — ${desc}`}
    >
      <span className="badge-tile__emoji" aria-hidden="true">
        {earned ? emoji : '🔒'}
      </span>
      <span className="badge-tile__name">{name}</span>
    </div>
  );
}
