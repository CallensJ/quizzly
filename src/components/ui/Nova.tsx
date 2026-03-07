'use client';

/**
 * src/components/ui/Nova.tsx
 *
 * Mascotte Nova — compagnon émotionnel de l'app.
 * Toujours en position: fixed (bas-droite) → aucun impact sur le flux du document.
 *
 * Auto-disparition : après `duration` ms si onHide fourni.
 * duration=0 → Nova reste visible jusqu'à unmount (ex: écran résultats).
 *
 * SVG utilisés pour un fond transparent propre et une meilleure netteté sur tous les écrans.
 */

import Image from 'next/image';
import { useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export type NovaState =
  | 'idle'
  | 'welcome'
  | 'correct'
  | 'streak'
  | 'wrong'
  | 'encouragement'
  | 'badge'
  | 'finish';

interface NovaProps {
  state: NovaState;
  message: string;
  visible: boolean;
  onHide?: () => void;
  /** ms avant disparition automatique. 0 = pas d'auto-disparition. */
  duration?: number;
}

// ── Mapping état → image ───────────────────────────────────────────────────

const STATE_IMAGES: Record<NovaState, string> = {
  idle:          '/mascotte/mascotte-idle.svg',
  welcome:       '/mascotte/mascotte-welcome.svg',
  correct:       '/mascotte/mascotte-correct.svg',
  streak:        '/mascotte/mascotte-streak.svg',
  wrong:         '/mascotte/mascotte-wrong.svg',
  encouragement: '/mascotte/mascotte-encouragement.svg',
  badge:         '/mascotte/mascotte-badge.svg',
  finish:        '/mascotte/mascotte-badge.svg', // TODO: remplacer par mascotte-finish.svg quand disponible
};

// ── Composant ─────────────────────────────────────────────────────────────

export default function Nova({ state, message, visible, onHide, duration = 2500 }: NovaProps) {
  // Timer d'auto-disparition — relancé à chaque changement de `visible`
  useEffect(() => {
    if (!visible || duration === 0 || !onHide) return;
    const timer = setTimeout(onHide, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onHide]);

  if (!visible) return null;

  return (
    <div className="nova" role="status" aria-live="polite" aria-label={message}>
      {/* Bulle de texte au-dessus de la mascotte */}
      <div className="nova__bubble">{message}</div>

      {/* alt vide — aria-label sur le conteneur suffit */}
      {/* unoptimized requis pour SVG avec next/image (optimisation désactivée par Next.js pour XSS) */}
      <Image
        src={STATE_IMAGES[state]}
        alt=""
        width={110}
        height={110}
        className="nova__img"
        priority
        unoptimized
      />
    </div>
  );
}
