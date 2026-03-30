'use client';

/**
 * src/components/features/admin/DangerZone.tsx
 *
 * Section "Zone de danger" de l'AdminScreen.
 * Réinitialisation de la progression et suppression du compte, avec double confirmation.
 * Gère son propre état de confirmation (confirmReset, confirmDelete).
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, RotateCcw } from 'lucide-react';

interface Props {
  onReset: () => void;
  onDelete: () => void;
}

export default function DangerZone({ onReset, onDelete }: Props) {
  const t = useTranslations('admin');
  const [confirmReset,  setConfirmReset]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <section className="admin__section admin__section--danger" aria-labelledby="admin-danger-title">
      <div className="admin__section-header">
        <Trash2 size={18} strokeWidth={2} aria-hidden="true" />
        <h2 id="admin-danger-title" className="admin__section-title">{t('dangerTitle')}</h2>
      </div>

      {/* Reset progression */}
      <div className="admin__danger-item">
        <div className="admin__danger-info">
          <p className="admin__danger-label">{t('dangerResetLabel')}</p>
          <p className="admin__danger-desc">{t('dangerResetDesc')}</p>
        </div>

        {!confirmReset ? (
          <button
            type="button"
            className="admin__danger-btn admin__danger-btn--warning"
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw size={16} strokeWidth={2} />
            {t('dangerResetLabel')}
          </button>
        ) : (
          <div className="admin__danger-confirm">
            <p className="admin__danger-confirm-msg">Êtes-vous sûr ?</p>
            <div className="admin__danger-confirm-actions">
              <button
                type="button"
                className="admin__danger-btn admin__danger-btn--cancel"
                onClick={() => setConfirmReset(false)}
              >
                {t('dangerResetCancel')}
              </button>
              <button
                type="button"
                className="admin__danger-btn admin__danger-btn--destructive"
                onClick={() => { onReset(); setConfirmReset(false); }}
              >
                {t('dangerResetConfirm')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Supprimer le compte */}
      <div className="admin__danger-item">
        <div className="admin__danger-info">
          <p className="admin__danger-label">{t('dangerDeleteLabel')}</p>
          <p className="admin__danger-desc">{t('dangerDeleteDesc')}</p>
        </div>

        {!confirmDelete ? (
          <button
            type="button"
            className="admin__danger-btn admin__danger-btn--destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={16} strokeWidth={2} />
            {t('dangerDeleteLabel')}
          </button>
        ) : (
          <div className="admin__danger-confirm">
            <p className="admin__danger-confirm-msg">Êtes-vous sûr ? Cette action est irréversible.</p>
            <div className="admin__danger-confirm-actions">
              <button
                type="button"
                className="admin__danger-btn admin__danger-btn--cancel"
                onClick={() => setConfirmDelete(false)}
              >
                {t('dangerDeleteCancel')}
              </button>
              <button
                type="button"
                className="admin__danger-btn admin__danger-btn--destructive"
                onClick={() => { onDelete(); setConfirmDelete(false); }}
              >
                {t('dangerDeleteConfirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
