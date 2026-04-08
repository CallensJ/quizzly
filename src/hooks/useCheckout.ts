/**
 * src/hooks/useCheckout.ts
 *
 * Hook pour déclencher le paiement Stripe Checkout.
 * Récupère le JWT depuis authStore, appelle /api/stripe/checkout,
 * puis redirige vers l'URL Stripe retournée.
 */

'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export type CheckoutInterval = 'monthly' | 'semiannual';

export function useCheckout() {
  const session = useAuthStore((s) => s.session);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(interval: CheckoutInterval) {
    setError(null);

    if (!session?.access_token) {
      setError('Tu dois être connecté pour souscrire.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ interval }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? 'Une erreur est survenue.');
        return;
      }

      // Redirige vers Stripe Checkout
      window.location.href = data.url;
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  return { startCheckout, loading, error };
}
