'use client';

/**
 * src/components/features/subscribe/SubscribeCancelScreen.tsx
 *
 * Page affichée si l'utilisateur quitte le formulaire de paiement Stripe
 * sans finaliser. Aucun abonnement n'a été créé.
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { XCircle } from 'lucide-react';
import { useNovaPresence } from '@/hooks/useNovaPresence';

export default function SubscribeCancelScreen() {
  const t      = useTranslations('subscribe');
  const tNova  = useTranslations('nova');
  const router = useRouter();
  const { showNova, hideNova } = useNovaPresence();

  // Nova wrong — bulle douce et réconfortante, permanent jusqu'à navigation
  useEffect(() => {
    showNova('wrong', tNova('cancelSoft'), 0);
    return () => hideNova();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="subscribe-result subscribe-result--cancel">
      <div className="subscribe-result__icon">
        <XCircle size={64} />
      </div>
      <h1 className="subscribe-result__title">{t('cancelTitle')}</h1>
      <p className="subscribe-result__message">{t('cancelMessage')}</p>
      <div className="subscribe-result__actions">
        <button
          className="subscribe-result__cta"
          onClick={() => router.push('/subscribe')}
        >
          {t('retryLabel')}
        </button>
        <button
          className="subscribe-result__cta subscribe-result__cta--ghost"
          onClick={() => router.push('/home')}
        >
          {t('backHome')}
        </button>
      </div>
    </div>
  );
}
