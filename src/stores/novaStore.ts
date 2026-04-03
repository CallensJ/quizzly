'use client';

/**
 * src/stores/novaStore.ts
 *
 * État global de la mascotte Nova — Zustand sans persist (état UI transitoire).
 * Permet à n'importe quel composant de déclencher Nova sans prop drilling.
 *
 * Usage : `useNovaPresence()` → hook public exposant showNova / hideNova.
 * Le composant NovaMascot lit ce store et se rend de façon autonome.
 */

import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────

export type NovaStateType =
  | 'idle'
  | 'welcome'
  | 'correct'
  | 'wrong'
  | 'streak'
  | 'badge'
  | 'finish'
  | 'encouragement'
  | 'curious'
  | 'sleeping'
  | 'excited'
  | 'grateful';

interface NovaStore {
  /** État expressif courant de Nova */
  state: NovaStateType;
  /** Texte affiché dans la bulle */
  message: string;
  /** Visibilité du composant */
  visible: boolean;
  /** Durée avant auto-dismiss en ms. 0 = permanent jusqu'à hideNova(). */
  duration: number;

  /**
   * Affiche Nova avec l'état et le message donnés.
   * @param duration ms avant auto-disparition. Défaut 2500. 0 = permanent.
   */
  showNova: (state: NovaStateType, message: string, duration?: number) => void;
  /** Cache Nova immédiatement */
  hideNova: () => void;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useNovaStore = create<NovaStore>((set) => ({
  state:    'idle',
  message:  '',
  visible:  false,
  duration: 2500,

  showNova: (state, message, duration = 2500) =>
    set({ state, message, visible: true, duration }),

  hideNova: () => set({ visible: false }),
}));
