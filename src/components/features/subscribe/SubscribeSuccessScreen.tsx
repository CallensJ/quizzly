'use client';

/**
 * src/components/features/subscribe/SubscribeSuccessScreen.tsx
 *
 * Confirmation d'abonnement activé.
 * Polle la table subscriptions jusqu'à confirmer le statut 'active'
 * (le webhook Stripe peut prendre 1-3s) avant de rediriger vers /home.
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNovaPresence } from '@/hooks/useNovaPresence';
import { supabase } from '@/lib/supabaseBrowser';
import { useAuthStore } from '@/stores/authStore';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS     = 8; // 12s max avant redirection forcée

export default function SubscribeSuccessScreen() {
  const t      = useTranslations('subscribe');
  const tNova  = useTranslations('nova');
  const router = useRouter();
  const { showNova, hideNova } = useNovaPresence();
  const user         = useAuthStore((s) => s.user);
  const setIsPremium = useAuthStore((s) => s.setIsPremium);

  useEffect(() => {
    showNova('grateful', tNova('subscription'), 0);

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#667eea', '#764ba2', '#FFD700', '#10B981'],
    });

    let attempts = 0;
    let timerId: ReturnType<typeof setTimeout>;

    async function pollSubscription() {
      attempts++;

      if (user) {
        const { data } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();

        const isActive = data?.status === 'active' || data?.status === 'trialing';

        if (isActive) {
          // Confirme le statut dans le store avant la redirection.
          // refreshSession() force un event TOKEN_REFRESHED dans AuthProvider.onAuthStateChange
          // → re-check premium depuis une instance Supabase stable, sans conflit de lock.
          setIsPremium(true);
          await supabase.auth.refreshSession();
          hideNova();
          router.push('/home');
          return;
        }
      }

      // Pas encore actif ou pas de user — réessayer jusqu'à MAX_ATTEMPTS
      if (attempts < MAX_ATTEMPTS) {
        timerId = setTimeout(pollSubscription, POLL_INTERVAL_MS);
      } else {
        // Redirection forcée après timeout — l'user verra le bon état sur /home
        hideNova();
        router.push('/home');
      }
    }

    // Premier check après 1.5s — laisser le temps au webhook de traiter
    timerId = setTimeout(pollSubscription, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(timerId);
      hideNova();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="subscribe-result subscribe-result--success">
      <div className="subscribe-result__icon">
        <CheckCircle size={64} />
      </div>
      <h1 className="subscribe-result__title">{t('successTitle')}</h1>
      <p className="subscribe-result__message">{t('successMessage')}</p>
      <button
        className="subscribe-result__cta"
        onClick={() => router.push('/home')}
      >
        {t('goToApp')}
      </button>
    </div>
  );
}
