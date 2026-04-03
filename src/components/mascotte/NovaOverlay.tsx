'use client';

/**
 * src/components/mascotte/NovaOverlay.tsx
 *
 * Overlay plein écran pour les moments importants (badge, premium, gratitude).
 * Nova est centrée sur un fond semi-transparent avec animation d'entrée amplifiée.
 *
 * Déclenché via useNovaPresence() exactement comme NovaMascot,
 * mais les états 'badge' et 'grateful' activent automatiquement l'overlay
 * (géré par le consommateur qui choisit d'afficher NovaMascot ou NovaOverlay).
 *
 * Clic sur l'overlay → dismiss immédiat.
 */

import Image from 'next/image';
import NovaBubble from './NovaBubble';
import { useNovaStore, type NovaStateType } from '@/stores/novaStore';

// ── Mapping image (partagé avec NovaMascot) ────────────────────────────────

const STATE_IMAGES: Record<NovaStateType, string> = {
  idle:          '/mascotte/mascotte-idle.svg',
  welcome:       '/mascotte/mascotte-welcome.svg',
  correct:       '/mascotte/mascotte-correct.svg',
  streak:        '/mascotte/mascotte-streak.svg',
  wrong:         '/mascotte/mascotte-wrong.svg',
  encouragement: '/mascotte/mascotte-encouragement.svg',
  badge:         '/mascotte/mascotte-badge.svg',
  finish:        '/mascotte/mascotte-badge.svg',
  curious:       '/mascotte/mascotte-curious.svg',
  sleeping:      '/mascotte/mascotte-sleeping.svg',
  excited:       '/mascotte/mascotte-excited.svg',
  grateful:      '/mascotte/mascotte-grateful.svg',
};

// ── Composant ─────────────────────────────────────────────────────────────

export default function NovaOverlay() {
  const { state, message, visible, hideNova } = useNovaStore();

  if (!visible) return null;

  return (
    /* Fond semi-transparent cliquable pour dismiss */
    <div
      className="nova-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={message}
      onClick={hideNova}
    >
      <div
        className="nova-overlay__content"
        onClick={(e) => e.stopPropagation()} // évite dismiss si clic sur Nova
      >
        <Image
          src={STATE_IMAGES[state]}
          alt=""
          width={160}
          height={160}
          className="nova-overlay__img"
          priority
          unoptimized
          aria-hidden="true"
        />
        {message && <NovaBubble message={message} className="nova-overlay__bubble" />}

        {/* Tap to dismiss — indication visuelle discrète */}
        <button
          className="nova-overlay__dismiss"
          onClick={hideNova}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
