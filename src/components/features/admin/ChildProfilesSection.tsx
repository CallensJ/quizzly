'use client';

/**
 * src/components/features/admin/ChildProfilesSection.tsx
 *
 * Section "Profils enfants" de l'AdminScreen.
 * Liste les profils existants avec actions : switcher, supprimer, ajouter.
 * Gère son propre état de confirmation de suppression (deleteChildId).
 */

import Image from 'next/image';
import { useState } from 'react';
import { Users, UserPlus, Check, Trash2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { buildAvatarUrl } from '@/lib/avatars';
import type { AvatarStyle } from '@/lib/avatars';

export default function ChildProfilesSection() {
  const router = useRouter();

  const profiles           = useProfileStore((s) => s.profiles);
  const activeProfileId    = useProfileStore((s) => s.activeProfileId);
  const switchProfile      = useProfileStore((s) => s.switchProfile);
  const removeChildProfile = useProfileStore((s) => s.removeChildProfile);

  const [deleteChildId, setDeleteChildId] = useState<string | null>(null);

  function handleSwitchProfile(id: string) {
    switchProfile(id);
    router.replace('/home');
  }

  function handleDeleteChild(id: string) {
    removeChildProfile(id);
    setDeleteChildId(null);
    // Si plus aucun profil → retour à l'onboarding
    const remaining = useProfileStore.getState().profiles;
    if (remaining.length === 0) router.replace('/');
  }

  return (
    <section className="admin__section admin__section--profiles" aria-labelledby="admin-profiles-title">
      <div className="admin__section-header">
        <Users size={18} strokeWidth={2} aria-hidden="true" />
        <h2 id="admin-profiles-title" className="admin__section-title">
          Profils enfants
        </h2>
      </div>
      <p className="admin__section-desc">
        Gérez les profils de vos enfants. Chaque enfant a ses propres scores et badges.
      </p>

      <div className="admin__profiles-list">
        {profiles.map((p) => (
          <div key={p.id} className="admin__profile-item">
            <Image
              className="admin__profile-avatar"
              src={buildAvatarUrl(p.avatarId, (p.avatarStyle as AvatarStyle) ?? 'adventurer')}
              alt=""
              width={40}
              height={40}
              unoptimized
            />
            <span className="admin__profile-pseudo">{p.pseudo}</span>
            {p.id === activeProfileId && (
              <span className="admin__profile-active">
                <Check size={12} aria-hidden="true" />
                Actif
              </span>
            )}
            <div className="admin__profile-actions">
              {p.id !== activeProfileId && (
                <button
                  type="button"
                  className="admin__profile-switch"
                  onClick={() => handleSwitchProfile(p.id)}
                >
                  Jouer
                </button>
              )}
              {profiles.length > 1 && (
                <button
                  type="button"
                  className="admin__profile-delete"
                  onClick={() => setDeleteChildId(p.id)}
                  aria-label={`Supprimer ${p.pseudo}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="admin__profiles-add-btn"
        onClick={() => router.push('/profiles')}
      >
        <UserPlus size={16} strokeWidth={2} />
        Ajouter un enfant
      </button>

      {deleteChildId && (
        <div className="admin__danger-confirm" style={{ marginTop: '1rem' }}>
          <p className="admin__danger-confirm-msg">
            Supprimer le profil de «&nbsp;{profiles.find((p) => p.id === deleteChildId)?.pseudo}&nbsp;» ?
            Toute la progression sera perdue.
          </p>
          <div className="admin__danger-confirm-actions">
            <button
              type="button"
              className="admin__danger-btn admin__danger-btn--cancel"
              onClick={() => setDeleteChildId(null)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="admin__danger-btn admin__danger-btn--destructive"
              onClick={() => handleDeleteChild(deleteChildId)}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
