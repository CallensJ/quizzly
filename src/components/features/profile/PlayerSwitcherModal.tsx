'use client';

/**
 * src/components/features/profile/PlayerSwitcherModal.tsx
 *
 * Modale "Changer de joueur" — liste tous les profils locaux du device.
 * Affiche l'avatar DiceBear et le pseudo de chaque profil.
 * - Clic sur un profil : switchProfile(id) + redirection /home
 * - Option "Nouveau joueur" : redirection vers l'onboarding (/)
 * - Aucune vérification premium : accessible à tous les utilisateurs
 *
 * UI : bottom-sheet sur mobile, dialog centré sur desktop.
 * Animation : slide-up mobile / scale-in desktop (même pattern que BadgesModal).
 */

import Image from 'next/image';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, UserPlus, Check } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { buildAvatarUrl } from '@/lib/avatars';
import type { AvatarStyle } from '@/lib/avatars';

interface PlayerSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerSwitcherModal({ isOpen, onClose }: PlayerSwitcherModalProps) {
  const t = useTranslations('playerSwitcher');
  const router = useRouter();

  const profiles = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const switchProfile = useProfileStore((s) => s.switchProfile);

  // Scroll lock sur le body quand la modale est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Fermeture au clavier (Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSelectProfile(id: string) {
    if (id === activeProfileId) {
      onClose();
      return;
    }
    switchProfile(id);
    router.push('/home');
    onClose();
  }

  function handleNewPlayer() {
    router.push('/');
    onClose();
  }

  return (
    <div
      className="player-switcher__overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
    >
      <div
        className="player-switcher__panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="player-switcher__header">
          <h2 className="player-switcher__title">{t('title')}</h2>
          <button
            type="button"
            className="player-switcher__close"
            onClick={onClose}
            aria-label={t('close')}
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Liste des profils ─────────────────────────────────────────── */}
        <ul className="player-switcher__list" role="list">
          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`player-switcher__item${isActive ? ' player-switcher__item--active' : ''}`}
                  onClick={() => handleSelectProfile(p.id)}
                  aria-pressed={isActive}
                >
                  <Image
                    src={buildAvatarUrl(p.avatarId, (p.avatarStyle as AvatarStyle) || 'adventurer')}
                    alt={`Avatar de ${p.pseudo}`}
                    className="player-switcher__avatar"
                    width={48}
                    height={48}
                    unoptimized
                  />
                  <span className="player-switcher__pseudo">{p.pseudo}</span>
                  {isActive && (
                    <span className="player-switcher__active-badge" aria-hidden="true">
                      <Check size={16} strokeWidth={3} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* ── Séparateur + Nouveau joueur ───────────────────────────────── */}
        <div className="player-switcher__divider" aria-hidden="true" />
        <button
          type="button"
          className="player-switcher__new-player"
          onClick={handleNewPlayer}
        >
          <span className="player-switcher__new-icon" aria-hidden="true">
            <UserPlus size={20} strokeWidth={2} />
          </span>
          {t('newPlayer')}
        </button>
      </div>
    </div>
  );
}
