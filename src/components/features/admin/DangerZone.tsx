'use client';

/**
 * src/components/features/admin/DangerZone.tsx
 *
 * Section "Zone de danger" de l'AdminScreen.
 * Réinitialisation de la progression et suppression du compte, avec double confirmation.
 * Gère son propre état de confirmation (confirmReset, confirmDelete).
 *
 * Suppression du compte : appel API DELETE /api/account/delete (efface Supabase Auth +
 * table subscriptions), puis signOut, puis suppression du localStorage/Zustand.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, RotateCcw, ChevronDown } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { supabase } from '@/lib/supabaseBrowser';

interface Props {
  onReset: () => void;
}

export default function DangerZone({ onReset }: Props) {
  const t = useTranslations('admin');
  const router = useRouter();
  const deleteProfile = useProfileStore((s) => s.deleteProfile);
  const [open,          setOpen]          = useState(false);
  const [confirmReset,  setConfirmReset]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError(false);
    try {
      // Récupère la session en cours pour obtenir le JWT
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setDeleteError(true);
        setDeleteLoading(false);
        return;
      }
      // Supprime le compte côté Supabase (Auth + subscriptions)
      await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      // Déconnexion Supabase
      await supabase.auth.signOut();
      // Nettoyage localStorage + Zustand
      deleteProfile();
      router.replace('/');
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  }

  return (
    <section className="admin__section admin__section--danger" aria-labelledby="admin-danger-title">
      <button
        type="button"
        className="admin__danger-toggle"
        aria-expanded={open}
        aria-controls="admin-danger-body"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="admin__section-header">
          <Trash2 size={18} strokeWidth={2} aria-hidden="true" />
          <h2 id="admin-danger-title" className="admin__section-title">{t('dangerTitle')}</h2>
        </div>
        <ChevronDown
          size={18}
          strokeWidth={2}
          className={`admin__danger-chevron${open ? ' admin__danger-chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id="admin-danger-body">
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
                {deleteError && (
                  <p className="admin__danger-confirm-error">
                    Session expirée. Reconnecte-toi pour supprimer ton compte.
                  </p>
                )}
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
                    onClick={handleDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? '...' : t('dangerDeleteConfirm')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
