'use client';

/**
 * src/components/mascotte/NovaMascot.tsx
 *
 * Composant principal de la mascotte Nova v2.
 * Lit son état depuis novaStore — aucune prop requise.
 * À placer une seule fois dans le layout (AppLayout ou layout.tsx).
 *
 * Contraintes accessibilité :
 *  - pointer-events: none → Nova ne bloque jamais l'UI
 *  - aria-hidden="true" → l'image est décorative
 *  - aria-live sur NovaBubble → le message est annoncé aux lecteurs d'écran
 *
 * Pour déclencher Nova depuis n'importe quel composant :
 *   const { showNova } = useNovaPresence();
 *   showNova('excited', "Super !", 3000);
 */

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import NovaBubble from './NovaBubble';
import { useNovaStore, type NovaStateType } from '@/stores/novaStore';

// ── Mapping état → image SVG ───────────────────────────────────────────────

const STATE_IMAGES: Record<NovaStateType, string> = {
  idle:          '/mascotte/mascotte-idle.svg',
  welcome:       '/mascotte/mascotte-welcome.svg',
  correct:       '/mascotte/mascotte-correct.svg',
  streak:        '/mascotte/mascotte-streak.svg',
  wrong:         '/mascotte/mascotte-wrong.svg',
  encouragement: '/mascotte/mascotte-encouragement.svg',
  badge:         '/mascotte/mascotte-badge.svg',
  finish:        '/mascotte/mascotte-badge.svg',      // TODO: mascotte-finish.svg
  curious:       '/mascotte/mascotte-curious.svg',
  sleeping:      '/mascotte/mascotte-sleeping.svg',
  excited:       '/mascotte/mascotte-excited.svg',
  grateful:      '/mascotte/mascotte-grateful.svg',
};

// ── Mapping état → classe CSS d'animation ─────────────────────────────────

const STATE_CLASSES: Partial<Record<NovaStateType, string>> = {
  idle:          'nova--breathing',
  sleeping:      'nova--breathing',
  welcome:       'nova--bounce-in',
  excited:       'nova--jump',
  correct:       'nova--wiggle',
  streak:        'nova--wiggle',
  badge:         'nova--pulse',
  grateful:      'nova--pulse',
  wrong:         'nova--shake',
  curious:       'nova--head-tilt',
};

// ── Composant ─────────────────────────────────────────────────────────────

export default function NovaMascot() {
  const { state, message, visible, duration, hideNova } = useNovaStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss — reset à chaque changement de visibilité
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!visible || duration === 0) return;

    timerRef.current = setTimeout(hideNova, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration, hideNova]);

  if (!visible) return null;

  const animClass = STATE_CLASSES[state] ?? '';

  return (
    <div
      className={`nova nova--mascot ${animClass}`}
      // pointer-events géré en CSS — Nova ne bloque jamais l'UI
    >
      {message && <NovaBubble message={message} />}

      <Image
        src={STATE_IMAGES[state]}
        alt=""              // décoratif — aria-live sur la bulle suffit
        width={110}
        height={110}
        className="nova__img"
        priority
        unoptimized         // requis pour SVG avec next/image
        aria-hidden="true"
      />
    </div>
  );
}
