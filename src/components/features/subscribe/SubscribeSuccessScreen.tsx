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

export default function SubscribeSuccessScreen() {
  const t      = useTranslations('subscribe');
  const router = useRouter();

  // Redirection automatique vers Home après 4s
  useEffect(() => {
    const timer = setTimeout(() => router.push('/home'), 4000);
    return () => clearTimeout(timer);
  }, [router]);

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
