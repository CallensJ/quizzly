/**
 * src/hooks/useHydrated.ts
 *
 * Hook utilitaire pour détecter la fin de l'hydratation client.
 *
 * Remplace le pattern anti-pattern :
 *   const [hydrated, setHydrated] = useState(false);
 *   useEffect(() => { setHydrated(true); }, []);
 *
 * Ce pattern déclenche la règle lint react-hooks/set-state-in-effect.
 * useSyncExternalStore est l'approche recommandée par React pour distinguer
 * le rendu serveur (serverSnapshot = false) du rendu client (snapshot = true).
 */

import { useSyncExternalStore } from 'react';

// Souscription vide — on n'écoute aucun store externe, uniquement le snapshot server/client
const subscribe = () => () => {};

/**
 * Retourne `true` uniquement côté client après hydratation, `false` côté serveur.
 * Utilisé comme garde pour les composants qui lisent localStorage (Zustand persist).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,   // snapshot client : toujours hydraté
    () => false,  // snapshot serveur : pas encore hydraté
  );
}
