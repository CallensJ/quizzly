'use client';

/**
 * src/components/features/profiles/ProfileSelector.tsx
 *
 * Écran de sélection du profil enfant (multi-profils MVP 4).
 * Affiché quand il y a plusieurs profils et qu'aucun n'est actif,
 * ou depuis le bouton "Changer d'enfant" (sidebar / AdminScreen).
 *
 * Fonctionnalités :
 *   - Grille de cartes profil (avatar + pseudo) — clic pour activer
 *   - Bouton "Ajouter un enfant" → mini-formulaire inline (pseudo + avatar)
 *   - Confirmation avant suppression d'un profil enfant
 */

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { Plus, X, Check } from 'lucide-react';
import { buildAvatarUrl, FREE_SEEDS, FREE_STYLE } from '@/lib/avatars';
import { useNovaPresence } from '@/hooks/useNovaPresence';
import { useSubscription } from '@/hooks/useSubscription';
import { syncProfile } from '@/lib/sync';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileSelector() {
  const t = useTranslations('profiles');
  const tNova = useTranslations('nova');
  const router = useRouter();
  const { showNova } = useNovaPresence();

  const profiles        = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const switchProfile   = useProfileStore((s) => s.switchProfile);
  const addChildProfile = useProfileStore((s) => s.addChildProfile);

  const { isPremium } = useSubscription();
  // Gratuit : max 1 profil — Premium : max 4 profils
  const canAddProfile = isPremium ? profiles.length < 4 : profiles.length < 1;

  // ── État UI ────────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPseudo, setNewPseudo]     = useState('');
  const [newAvatarId, setNewAvatarId] = useState<string | null>(null);

  const canAdd = newPseudo.trim().length >= 2 && newAvatarId !== null;

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleSelect(id: string) {
    switchProfile(id);
    router.replace('/home');
  }

  function handleAddProfile() {
    if (!canAdd) return;
    addChildProfile({
      pseudo: newPseudo.trim(),
      avatarId: newAvatarId!,
      avatarStyle: FREE_STYLE,
      badgeEarned: false,
      locale: useProfileStore.getState().profile?.locale ?? 'fr',
    });

    // Sync du nouveau profil vers Supabase en arrière-plan
    const { deviceId, activeProfileId, profiles } = useProfileStore.getState();
    const newProfile = profiles.find((p) => p.id === activeProfileId);
    if (deviceId && newProfile) {
      const authUser = useAuthStore.getState().user;
      syncProfile(deviceId, newProfile, null, null, authUser?.id).catch(() => {});
    }

    setShowAddForm(false);
    setNewPseudo('');
    setNewAvatarId(null);
    showNova('welcome', tNova('newChild'), 3000);
    router.replace('/home');
  }

  function handleCancelAdd() {
    setShowAddForm(false);
    setNewPseudo('');
    setNewAvatarId(null);
  }

  return (
    <div className="profiles">

      <header className="profiles__header">
        <h1 className="profiles__title">{t('title')}</h1>
        <p className="profiles__subtitle">{t('subtitle')}</p>
      </header>

      <main className="profiles__body">

        {/* ── Grille des profils existants ─────────────────────────────── */}
        <div className="profiles__grid" role="list">
          {profiles.map((p) => (
            <div key={p.id} className="profiles__item" role="listitem">
              <button
                type="button"
                className={`profiles__card${p.id === activeProfileId ? ' profiles__card--active' : ''}`}
                onClick={() => handleSelect(p.id)}
                aria-label={t('selectAriaLabel', { pseudo: p.pseudo })}
              >
                <Image
                  className="profiles__avatar"
                  src={buildAvatarUrl(p.avatarId, (p.avatarStyle ?? 'adventurer') as never)}
                  alt=""
                  width={80}
                  height={80}
                  unoptimized
                />
                <span className="profiles__pseudo">{p.pseudo}</span>
                {p.id === activeProfileId && (
                  <span className="profiles__active-badge">
                    <Check size={12} />
                    {t('activeBadge')}
                  </span>
                )}
              </button>
            </div>
          ))}

          {/* ── Carte "Ajouter un enfant" — visible uniquement si limite non atteinte ── */}
          {!showAddForm && canAddProfile && (
            <button
              type="button"
              className="profiles__add-card"
              onClick={() => setShowAddForm(true)}
              aria-label={t('addAriaLabel')}
            >
              <Plus size={28} aria-hidden="true" />
              <span>{t('addLabel')}</span>
            </button>
          )}
        </div>

        {/* ── Mini-formulaire ajout de profil ──────────────────────────── */}
        {showAddForm && (
          <div className="profiles__add-form" role="dialog" aria-modal="true" aria-label={t('addFormTitle')}>
            <div className="profiles__add-form-inner">
              <div className="profiles__add-form-header">
                <h2 className="profiles__add-form-title">{t('addFormTitle')}</h2>
                <button
                  type="button"
                  className="profiles__add-form-close"
                  onClick={handleCancelAdd}
                  aria-label={t('cancelAriaLabel')}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Pseudo */}
              <label htmlFor="new-pseudo" className="profiles__add-label">
                {t('pseudoLabel')}
              </label>
              <input
                id="new-pseudo"
                type="text"
                className="profiles__add-input"
                placeholder={t('pseudoPlaceholder')}
                value={newPseudo}
                onChange={(e) => setNewPseudo(e.target.value)}
                maxLength={20}
                autoComplete="off"
                autoFocus
              />

              {/* Grille avatars */}
              <p className="profiles__add-label">{t('avatarLabel')}</p>
              <div className="profiles__add-avatars">
                {FREE_SEEDS.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    className={`profiles__add-avatar${newAvatarId === seed ? ' profiles__add-avatar--active' : ''}`}
                    onClick={() => setNewAvatarId(seed)}
                    aria-label={seed}
                    aria-pressed={newAvatarId === seed}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <Image src={buildAvatarUrl(seed)} alt="" width={56} height={56} unoptimized />
                  </button>
                ))}
              </div>

              {/* CTA */}
              <div className="profiles__add-actions">
                <button
                  type="button"
                  className="profiles__add-cancel"
                  onClick={handleCancelAdd}
                >
                  {t('cancelLabel')}
                </button>
                <button
                  type="button"
                  className="profiles__add-confirm"
                  disabled={!canAdd}
                  onClick={handleAddProfile}
                >
                  {t('addConfirmLabel')}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
