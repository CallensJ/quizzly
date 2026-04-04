'use client';

/**
 * src/components/features/subscribe/SubscribeSuccessScreen.tsx
 *
 * Confirmation d'abonnement activé.
 * Le webhook Stripe a déjà mis à jour la table subscriptions en base.
 * On redirige vers /home après 4s ou sur clic du bouton.
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNovaPresence } from '@/hooks/useNovaPresence';

export default function SubscribeSuccessScreen() {
  const t      = useTranslations('subscribe');
  const tNova  = useTranslations('nova');
  const router = useRouter();
  const { showNova, hideNova } = useNovaPresence();

  // Nova grateful + confetti au montage — moment prioritaire
  useEffect(() => {
    showNova('grateful', tNova('subscription'), 0);

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#667eea', '#764ba2', '#FFD700', '#10B981'],
    });

    // Redirection automatique vers Home après 4s
    const timer = setTimeout(() => {
      hideNova();
      router.push('/home');
    }, 4000);

    return () => {
      clearTimeout(timer);
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
