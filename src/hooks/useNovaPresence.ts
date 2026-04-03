'use client';

/**
 * src/hooks/useNovaPresence.ts
 *
 * Hook public pour contrôler la mascotte Nova depuis n'importe quel composant.
 * Abstrait le store Zustand — les consommateurs n'importent pas novaStore directement.
 *
 * Usage :
 *   const { showNova, hideNova } = useNovaPresence();
 *   showNova('excited', t('nova.excited'), 3000);
 */

import { useNovaStore, type NovaStateType } from '@/stores/novaStore';

export function useNovaPresence() {
  const showNova = useNovaStore((s) => s.showNova);
  const hideNova = useNovaStore((s) => s.hideNova);

  return { showNova, hideNova };
}

export type { NovaStateType };
