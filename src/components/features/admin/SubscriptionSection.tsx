'use client';

/**
 * src/components/features/admin/SubscriptionSection.tsx
 *
 * Section "Abonnement Premium" de l'AdminScreen.
 * États : chargement → essai actif → premium actif → essai terminé.
 *
 * v1.4 n'a plus de palier gratuit permanent (cahier-des-charges-claude-v1.4.md
 * §5) — l'état "inactif" signifie toujours "essai expiré", jamais "version
 * gratuite". Le bouton "Gérer l'abonnement" (portail Stripe) n'est proposé
 * qu'en Premium payant : un essai seul n'a pas de ligne `subscriptions`
 * (donc pas de stripe_customer_id) et le portail échouerait sinon.
 */

import { useTranslations } from 'next-intl';
import { Crown, CheckCircle, Clock, Settings, Zap, Loader } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { usePortal } from '@/hooks/usePortal';

export default function SubscriptionSection() {
  const t      = useTranslations('admin');
  const router = useRouter();
  const { accessStatus, trialDaysLeft, loading } = useSubscription();
  const { openPortal, loading: portalLoading, error: portalError } = usePortal();

  return (
    <section className="admin__section admin__section--subscription" aria-labelledby="admin-sub-title">
      <div className="admin__section-header">
        <Crown size={18} strokeWidth={2} aria-hidden="true" />
        <h2 id="admin-sub-title" className="admin__section-title">{t('subTitle')}</h2>
      </div>

      {/* Vérification en cours — évite d'afficher "go premium" à tort pendant le check DB */}
      {loading ? (
        <div className="admin__sub-checking" aria-live="polite" aria-busy="true">
          <Loader size={16} className="admin__sub-checking-icon" aria-hidden="true" />
          <span>{t('subLoading')}</span>
        </div>
      ) : accessStatus === 'trial' ? (
        <div className="admin__sub-active">
          <div className="admin__sub-premium-badge">
            <Clock size={16} aria-hidden="true" />
            {t('subTrialing')}
          </div>
          <p className="admin__section-desc">
            {trialDaysLeft !== null && t('subTrialDaysLeft', { days: trialDaysLeft })}
          </p>
        </div>
      ) : accessStatus === 'premium' ? (
        <div className="admin__sub-active">
          <div className="admin__sub-premium-badge">
            <CheckCircle size={16} aria-hidden="true" />
            {t('subActive')}
          </div>
          <p className="admin__section-desc">{t('subDesc')}</p>
          <button
            type="button"
            className="admin__sub-manage-btn"
            onClick={openPortal}
            disabled={portalLoading}
          >
            <Settings size={15} aria-hidden="true" />
            {portalLoading ? t('subManageLoading') : t('subManage')}
          </button>
          {portalError && <p className="admin__error">{portalError}</p>}
        </div>
      ) : (
        <div className="admin__sub-inactive">
          <div className="admin__sub-free-badge">
            <Clock size={13} aria-hidden="true" />
            {t('subExpired')}
          </div>
          <p className="admin__section-desc">{t('subDesc')}</p>
          <button
            type="button"
            className="admin__sub-upgrade-btn"
            onClick={() => router.push('/subscribe')}
          >
            <Zap size={16} aria-hidden="true" />
            {t('subUpgrade')}
          </button>
        </div>
      )}
    </section>
  );
}
