'use client';

/**
 * src/components/features/admin/SubscriptionSection.tsx
 *
 * Section "Abonnement Premium" de l'AdminScreen.
 * États : chargement → premium actif → version gratuite.
 */

import { useTranslations } from 'next-intl';
import { Crown, CheckCircle, Settings, Zap, Lock, Loader } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { usePortal } from '@/hooks/usePortal';

export default function SubscriptionSection() {
  const t      = useTranslations('admin');
  const router = useRouter();
  const { isPremium, status: subStatus, loading } = useSubscription();
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
      ) : isPremium ? (
        <div className="admin__sub-active">
          {/* Statut clair avec icône verte */}
          <div className="admin__sub-premium-badge">
            <CheckCircle size={16} aria-hidden="true" />
            {subStatus === 'trialing' ? "Essai gratuit en cours" : "Premium actif"}
          </div>
          <p className="admin__section-desc">
            {subStatus === 'trialing'
              ? "Profitez de toutes les fonctionnalités Premium pendant votre période d'essai."
              : "Toutes les catégories débloquées · Jusqu'à 4 profils · Synchronisation multi-appareils."}
          </p>
          <button
            type="button"
            className="admin__sub-manage-btn"
            onClick={openPortal}
            disabled={portalLoading}
          >
            <Settings size={15} aria-hidden="true" />
            {portalLoading ? t('subManageLoading') : "Gérer l'abonnement"}
          </button>
          {portalError && <p className="admin__error">{portalError}</p>}
        </div>
      ) : (
        <div className="admin__sub-inactive">
          {/* Badge version gratuite */}
          <div className="admin__sub-free-badge">
            <Lock size={13} aria-hidden="true" />
            Version gratuite
          </div>
          <p className="admin__section-desc">
            1 profil enfant · 4 catégories · 100 questions par catégorie.
          </p>
          <button
            type="button"
            className="admin__sub-upgrade-btn"
            onClick={() => router.push('/subscribe')}
          >
            <Zap size={16} aria-hidden="true" />
            Passer Premium — 1,99 €/mois
          </button>
        </div>
      )}
    </section>
  );
}
