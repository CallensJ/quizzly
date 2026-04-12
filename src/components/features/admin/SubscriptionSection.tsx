'use client';

/**
 * src/components/features/admin/SubscriptionSection.tsx
 *
 * Section "Abonnement Premium" de l'AdminScreen.
 * Affiche le statut de l'abonnement Stripe et les actions disponibles :
 *   - Actif    → bouton "Gérer" (Customer Portal Stripe)
 *   - Inactif  → bouton "Passer à Premium" (redirect /subscribe)
 */

import { useTranslations } from 'next-intl';
import { Crown, CreditCard, Zap } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { usePortal } from '@/hooks/usePortal';

export default function SubscriptionSection() {
  const t      = useTranslations('admin');
  const router = useRouter();
  const { isPremium, status: subStatus, loading: subLoading } = useSubscription();
  const { openPortal, loading: portalLoading, error: portalError } = usePortal();

  return (
    <section className="admin__section admin__section--subscription" aria-labelledby="admin-sub-title">
      <div className="admin__section-header">
        <Crown size={18} strokeWidth={2} aria-hidden="true" />
        <h2 id="admin-sub-title" className="admin__section-title">{t('subTitle')}</h2>
      </div>

      {subLoading ? (
        <div className="admin__sub-loading">
          <p className="admin__section-desc">{t('subLoading')}</p>
        </div>
      ) : isPremium ? (
        <div className="admin__sub-active">
          <p className="admin__sub-status admin__sub-status--active">{t('subActive')}</p>
          <p className="admin__sub-plan">
            {subStatus === 'trialing' ? t('subTrialing') : t('subRenews')}
          </p>
          <button
            type="button"
            className="admin__sub-manage-btn"
            onClick={openPortal}
            disabled={portalLoading}
          >
            <CreditCard size={16} />
            {portalLoading ? t('subManageLoading') : t('subManage')}
          </button>
          {portalError && <p className="admin__error">{portalError}</p>}
        </div>
      ) : (
        <div className="admin__sub-inactive">
          <p className="admin__section-desc">{t('subDesc')}</p>
          <button
            type="button"
            className="admin__sub-upgrade-btn"
            onClick={() => router.push('/subscribe')}
          >
            <Zap size={16} />
            {t('subUpgrade')}
          </button>
        </div>
      )}
    </section>
  );
}
