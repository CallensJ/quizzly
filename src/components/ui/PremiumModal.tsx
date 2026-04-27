'use client';

/**
 * src/components/ui/PremiumModal.tsx
 *
 * Modale de conversion freemium → premium.
 * Affichée au clic d'une catégorie verrouillée dans HomeScreen.
 *
 * Flow :
 *   User connecté    → CTA redirige vers /subscribe (checkout direct)
 *   User non connecté → CTA redirige vers /auth/login (création de compte)
 */

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Zap, Check, X } from 'lucide-react';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const t = useTranslations('premiumModal');
  const router = useRouter();

  if (!visible) return null;

  function handleSubscribe() {
    onClose();
    router.push('/subscribe');
  }

  return (
    <div
      className="premium-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="premium-modal">
        <button
          type="button"
          className="premium-modal__close"
          onClick={onClose}
          aria-label={t('closeAriaLabel')}
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="premium-modal__nova">
          <Image
            src="/mascotte/mascotte-excited.svg"
            alt=""
            width={80}
            height={80}
            unoptimized
          />
        </div>

        <div className="premium-modal__badge">
          <Zap size={14} aria-hidden="true" />
          {t('badge')}
        </div>

        <h2 className="premium-modal__title">{t('title')}</h2>
        <p className="premium-modal__subtitle">{t('subtitle')}</p>

        <ul className="premium-modal__perks" aria-label={t('perksLabel')}>
          {(['perk1', 'perk2', 'perk3'] as const).map((key) => (
            <li key={key} className="premium-modal__perk">
              <span className="premium-modal__perk-check" aria-hidden="true">
                <Check size={14} strokeWidth={3} />
              </span>
              {t(key)}
            </li>
          ))}
        </ul>

        <div className="premium-modal__pricing">
          <span className="premium-modal__price">{t('price')}</span>
          <span className="premium-modal__price-alt">{t('priceAlt')}</span>
        </div>

        <div className="premium-modal__actions">
          <button
            type="button"
            className="premium-modal__cancel"
            onClick={onClose}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="premium-modal__cta"
            onClick={handleSubscribe}
          >
            {t('cta')}
          </button>
        </div>
      </div>
    </div>
  );
}
