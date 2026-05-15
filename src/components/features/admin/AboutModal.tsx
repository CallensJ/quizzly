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
import { useTranslations, useLocale } from 'next-intl';
import { X, RefreshCw, ExternalLink } from 'lucide-react';
import { getDB } from '@/lib/db';

// Version synchronisée avec package.json — à mettre à jour à chaque release
const APP_VERSION = '1.3.2';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const t = useTranslations('admin');
  const locale = useLocale();
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

          {/* Dernières corrections v1.3.2 */}
          <div className="about-modal__changelog">
            <p className="about-modal__changelog-title">
              {locale === 'fr' ? `Corrections v${APP_VERSION}` : `Fixes v${APP_VERSION}`}
            </p>
            <ul className="about-modal__changelog-list">
              {locale === 'fr' ? (
                <>
                  <li>Catégories Technologie &amp; Mathématique : doublons supprimés, questions rééquilibrées</li>
                  <li>Pop Culture FR : 27 doublons supprimés, distribution des réponses corrigée</li>
                  <li>Sync multi-profils (premium) : tous les profils restaurés sur un nouvel appareil</li>
                  <li>Suppression profil enfant : données associées supprimées automatiquement</li>
                  <li>Sécurité : accès espace parent restreint aux comptes authentifiés</li>
                </>
              ) : (
                <>
                  <li>Technology &amp; Mathematics categories: duplicates removed, questions rebalanced</li>
                  <li>Pop Culture FR: 27 duplicates removed, answer distribution fixed</li>
                  <li>Multi-profile sync (premium): all profiles restored on a new device</li>
                  <li>Child profile deletion: associated data automatically removed</li>
                  <li>Security: parent dashboard access restricted to authenticated accounts</li>
                </>
              )}
            </ul>
          </div>

          {/* Liens externes */}
          <div className="about-modal__links">
            <a
              href={`https://erudia.app/${locale}/changelog`}
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
