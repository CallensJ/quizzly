'use client';

/**
 * src/components/ui/Nova.tsx
 *
 * Alias de rétro-compatibilité Nova v1 → v2.
 * Les composants existants (QuizScreen, ResultsScreen, OnboardingScreen)
 * continuent de passer leurs props locales sans changement.
 *
 * Ce wrapper injecte l'état dans novaStore afin que NovaMascot
 * (placé dans AppLayout) soit celui qui rend réellement Nova.
 * Cela évite d'avoir deux instances de Nova simultanément.
 *
 * Migration future : remplacer les usages par useNovaPresence() directement.
 */

import { useEffect } from 'react';
import { useNovaStore } from '@/stores/novaStore';
import type { NovaStateType } from '@/stores/novaStore';

// ── Types — conservés pour compatibilité avec les imports existants ─────────

/** @deprecated Utiliser NovaStateType depuis novaStore */
export type NovaState = NovaStateType;

interface NovaProps {
  state: NovaState;
  message: string;
  visible: boolean;
  onHide?: () => void;
  /** ms avant disparition automatique. 0 = pas d'auto-disparition. */
  duration?: number;
}

// ── Composant ─────────────────────────────────────────────────────────────

export default function Nova({ state, message, visible, onHide, duration = 2500 }: NovaProps) {
  const { showNova, hideNova } = useNovaStore();

  // Synchronise les props locales → store global
  useEffect(() => {
    if (visible) {
      showNova(state, message, duration);
    } else {
      hideNova();
    }
  }, [visible, state, message, duration, showNova, hideNova]);

  // Quand le store cache Nova, on remonte l'événement au parent via onHide
  useEffect(() => {
    if (!visible || duration === 0 || !onHide) return;
    const timer = setTimeout(onHide, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onHide]);

  // Ce composant ne rend rien — NovaMascot dans AppLayout s'en charge
  return null;
}
