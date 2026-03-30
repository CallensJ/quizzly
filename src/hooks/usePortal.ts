/**
 * src/hooks/usePortal.ts
 *
 * Ouvre le Stripe Customer Portal pour gérer l'abonnement.
 */

'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function usePortal() {
  const session = useAuthStore((s) => s.session);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function openPortal() {
    setError(null);
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const res  = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Une erreur est survenue.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  return { openPortal, loading, error };
}
