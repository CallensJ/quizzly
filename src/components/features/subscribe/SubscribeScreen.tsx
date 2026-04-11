'use client';

/**
 * src/components/features/subscribe/SubscribeScreen.tsx
 *
 * Page d'abonnement Erudia Premium.
 * Affiche les deux plans (mensuel / annuel) avec toggle et redirige
 * vers Stripe Checkout via le hook useCheckout.
 *
 * Redirige vers /auth/login si l'utilisateur n'est pas connecté.
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Check, Star, ArrowLeft, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useCheckout, type CheckoutInterval } from '@/hooks/useCheckout';

export default function SubscribeScreen() {
  const t        = useTranslations('subscribe');
  const router   = useRouter();
  const { user, loading: authLoading } = useAuthStore();

  const [interval, setInterval] = useState<CheckoutInterval>('semiannual');
  const { startCheckout, loading, error } = useCheckout();

  // Redirige vers login si non connecté (après chargement auth)
  // Passe ?next=/subscribe pour revenir ici après connexion
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?next=/subscribe');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="subscribe subscribe--loading">
        <div className="subscribe__spinner" aria-label="Chargement…" role="status" />
      </div>
    );
  }

  const features = [
    t('feature1'),
    t('feature2'),
    t('feature3'),
    t('feature4'),
    t('feature5'),
  ];

  return (
    <div className="subscribe">
      <button className="subscribe__back" onClick={() => router.back()}>
        <ArrowLeft size={20} />
        {t('back')}
      </button>

      <div className="subscribe__header">
        <div className="subscribe__badge">
          <Star size={16} />
          {t('badgeLabel')}
        </div>
        <h1 className="subscribe__title">{t('title')}</h1>
        <p className="subscribe__subtitle">{t('subtitle')}</p>
      </div>

      {/* Toggle mensuel / semestriel */}
      <div className="subscribe__toggle">
        <button
          className={`subscribe__toggle-btn${interval === 'monthly' ? ' subscribe__toggle-btn--active' : ''}`}
          onClick={() => setInterval('monthly')}
        >
          {t('monthly')}
        </button>
        <button
          className={`subscribe__toggle-btn${interval === 'semiannual' ? ' subscribe__toggle-btn--active' : ''}`}
          onClick={() => setInterval('semiannual')}
        >
          {t('semiannual')}
          <span className="subscribe__toggle-savings">{t('semiannualSavings')}</span>
        </button>
      </div>

      {/* Carte prix */}
      <div className="subscribe__card">
        <div className="subscribe__price">
          <span className="subscribe__price-amount">
            {interval === 'semiannual' ? '9,99\u00a0€' : '1,99\u00a0€'}
          </span>
          <span className="subscribe__price-period">
            {interval === 'semiannual' ? t('per6months') : t('perMonth')}
          </span>
        </div>

        {interval === 'semiannual' && (
          <p className="subscribe__price-equiv">{t('semiannualEquiv')}</p>
        )}

        {/* Liste des avantages */}
        <ul className="subscribe__features">
          {features.map((feat, i) => (
            <li key={i} className="subscribe__feature">
              <Check size={18} className="subscribe__feature-icon" />
              {feat}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          className="subscribe__cta"
          onClick={() => startCheckout(interval)}
          disabled={loading}
        >
          <Zap size={18} />
          {loading ? t('loading') : t('cta')}
        </button>

        {error && <p className="subscribe__error">{error}</p>}

        <p className="subscribe__legal">{t('legal')}</p>
      </div>
    </div>
  );
}
