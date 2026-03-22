'use client';

/**
 * src/hooks/useOnlineSync.ts
 *
 * Hook qui écoute les événements réseau et rejoue la queue offline
 * (sessions/profil non syncés pendant la déconnexion) dès le retour en ligne.
 *
 * Utilisation : monté une seule fois dans AuthProvider (layout global).
 */

import { useEffect } from 'react';
import { processOfflineQueue } from '@/lib/sync';

export function useOnlineSync(): void {
  useEffect(() => {
    const handleOnline = () => {
      processOfflineQueue();
    };

    window.addEventListener('online', handleOnline);

    // Traite aussi les items en queue au démarrage si déjà en ligne
    // (couvre le cas d'un restart après une session offline)
    if (navigator.onLine) {
      processOfflineQueue();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, []);
}
