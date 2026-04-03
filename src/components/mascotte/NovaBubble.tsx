'use client';

/**
 * src/components/mascotte/NovaBubble.tsx
 *
 * Bulle de dialogue de Nova — composant pur, sans état global.
 * Peut être utilisée seule ou intégrée dans NovaMascot.
 *
 * La bulle est accessible via aria-live="polite" : les lecteurs d'écran
 * annoncent le message sans interrompre l'utilisateur.
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface NovaBubbleProps {
  message: string;
  /** Classe CSS additionnelle pour le positionnement contextuel */
  className?: string;
}

// ── Composant ─────────────────────────────────────────────────────────────

export default function NovaBubble({ message, className }: NovaBubbleProps) {
  return (
    <div
      className={['nova__bubble', className].filter(Boolean).join(' ')}
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
