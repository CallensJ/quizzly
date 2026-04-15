'use client';

/**
 * src/components/features/admin/AboutModal.tsx
 *
 * Modale "À propos" de l'espace parent.
 * Affiche la version de l'app, un lien vers le site, un bouton de mise à jour
 * du contenu (vide le cache questions IndexedDB + force le SW à se mettre à jour),
 * ainsi que des liens vers le changelog et les mentions légales.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, RefreshCw, ExternalLink } from 'lucide-react';
import { getDB } from '@/lib/db';

// Version synchronisée avec package.json — à mettre à jour à chaque release
const APP_VERSION = '0.1.0';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const t = useTranslations('admin');
  const [updating, setUpdating] = useState(false);
  const [updateDone, setUpdateDone] = useState(false);

  if (!isOpen) return null;

  // Vide le cache questions IndexedDB et force le service worker à se mettre à jour
  async function handleUpdateContent() {
    setUpdating(true);
    try {
      const db = getDB();
      if (db) await db.questionCache.clear().catch(() => {});
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.update();
      setUpdateDone(true);
      setTimeout(() => setUpdateDone(false), 3000);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className="about-modal__overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('aboutTitle')}
    >
      <div
        className="about-modal__panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="about-modal__header">
          <h2 className="about-modal__title">{t('aboutTitle')}</h2>
          <button
            type="button"
            className="about-modal__close"
            onClick={onClose}
            aria-label={t('aboutClose')}
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Corps ── */}
        <div className="about-modal__body">
          {/* Version + lien site */}
          <div className="about-modal__info">
            <p className="about-modal__version">v{APP_VERSION}</p>
            <a
              href="https://erudia.app"
              target="_blank"
              rel="noopener noreferrer"
              className="about-modal__site"
            >
              erudia.app
              <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>

          {/* Bouton mise à jour contenu */}
          <button
            type="button"
            className="about-modal__update-btn"
            onClick={handleUpdateContent}
            disabled={updating}
            aria-busy={updating}
          >
            <RefreshCw
              size={15}
              strokeWidth={2}
              aria-hidden="true"
              className={updating ? 'about-modal__spin' : ''}
            />
            {updateDone
              ? t('aboutUpdated')
              : updating
                ? t('aboutUpdating')
                : t('aboutUpdate')}
          </button>

          {/* Liens externes */}
          <div className="about-modal__links">
            <a
              href="https://erudia.app/changelog"
              target="_blank"
              rel="noopener noreferrer"
              className="about-modal__link"
            >
              {t('aboutChangelog')}
            </a>
            <a
              href="https://erudia.app/mentions.html"
              target="_blank"
              rel="noopener noreferrer"
              className="about-modal__link"
            >
              {t('aboutLegal')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
