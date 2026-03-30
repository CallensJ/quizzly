'use client';

/**
 * src/components/features/profile/BadgesModal.tsx
 *
 * Shell de la modale "Mes Trophées".
 * Gère : overlay, fermeture (clic overlay / touche Escape), lock du scroll body.
 * Le contenu est délégué à BadgesModalContent pour rester léger.
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import BadgesModalContent from './BadgesModalContent';

interface BadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  earnedBadgeIds: string[];
}

export default function BadgesModal({ isOpen, onClose, earnedBadgeIds }: BadgesModalProps) {
  const t = useTranslations('badges');

  // Fermeture via la touche Escape
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  // Bloque le scroll du body pendant que la modale est ouverte
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="badges-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t('modalTitle')}
    >
      {/* Overlay semi-transparent — clic pour fermer */}
      <div
        className="badges-modal__overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel principal */}
      <div className="badges-modal__panel">

        {/* Header sticky */}
        <div className="badges-modal__header">
          <h2 className="badges-modal__title">{t('modalTitle')}</h2>
          <button
            type="button"
            className="badges-modal__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <BadgesModalContent earnedBadgeIds={earnedBadgeIds} />
      </div>
    </div>
  );
}
