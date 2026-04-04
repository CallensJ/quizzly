'use client';

/**
 * src/components/features/profile/AvatarGallery.tsx
 *
 * Galerie de sélection d'avatar inline (slide-down depuis ProfileScreen).
 * Section "Gratuit" : 8 seeds adventurer sélectionnables.
 * Section "Premium" : 4 styles × 8 seeds — verrouillés si non-abonné,
 *                     redirige vers /subscribe au clic.
 */

import { useTranslations } from 'next-intl';
import { Crown, Lock } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { FREE_SEEDS, FREE_STYLE, PREMIUM_STYLES, buildAvatarUrl } from '@/lib/avatars';
import type { AvatarStyle } from '@/lib/avatars';
import type { Profile } from '@/types';
import { useNovaPresence } from '@/hooks/useNovaPresence';

interface Props {
  profile:        Profile;
  isPremium:      boolean;
  onSelectAvatar: (seed: string, style: AvatarStyle) => void;
}

export default function AvatarGallery({ profile, isPremium, onSelectAvatar }: Props) {
  const t      = useTranslations('profile');
  const tNova  = useTranslations('nova');
  const router = useRouter();
  const { showNova } = useNovaPresence();

  return (
    <div className="profile__avatar-gallery" role="group" aria-label={t('changeAvatar')}>

      {/* Section gratuite — 8 avatars adventurer */}
      <p className="profile__avatar-section-title">{t('avatarFree')}</p>
      <div className="profile__avatar-row">
        {FREE_SEEDS.map((seed) => {
          const isActive = profile.avatarId === seed &&
            (!profile.avatarStyle || profile.avatarStyle === FREE_STYLE);
          return (
            <button
              key={seed}
              type="button"
              className={`profile__avatar-option${isActive ? ' profile__avatar-option--active' : ''}`}
              onClick={() => onSelectAvatar(seed, FREE_STYLE)}
              aria-label={seed}
              aria-pressed={isActive}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={buildAvatarUrl(seed)} alt="" width={60} height={60} loading="lazy" />
            </button>
          );
        })}
      </div>

      {/* Section premium — déverrouillée si abonné, sinon redirige vers /subscribe */}
      <p className="profile__avatar-section-title profile__avatar-section-title--premium">
        <Crown size={14} aria-hidden="true" />
        {t('avatarPremium')}
      </p>
      {!isPremium && (
        <button className="profile__premium-banner" onClick={() => router.push('/subscribe')}>
          <Crown size={16} aria-hidden="true" />
          {t('avatarPremiumUpgrade')}
        </button>
      )}

      {PREMIUM_STYLES.map(({ style, label, seeds }) => (
        <div key={style} className="profile__avatar-premium-group">
          <p className="profile__avatar-style-label">{label}</p>
          <div className="profile__avatar-row">
            {seeds.slice(0, isPremium ? 8 : 4).map((seed) => {
              const isActive = profile.avatarId === seed && profile.avatarStyle === style;
              return (
                <button
                  key={seed}
                  type="button"
                  className={`profile__avatar-option${
                    isPremium
                      ? isActive ? ' profile__avatar-option--selected' : ''
                      : ' profile__avatar-option--locked'
                  }`}
                  aria-label={isPremium ? seed : `${seed} — ${t('avatarPremiumRequired')}`}
                  aria-pressed={isPremium ? isActive : undefined}
                  aria-disabled={!isPremium}
                  onClick={() => {
                    if (isPremium) {
                      onSelectAvatar(seed, style);
                      // Nova badge — avatar premium débloqué sélectionné
                      showNova('badge', tNova('avatarUnlocked'), 3000);
                    } else {
                      router.push('/subscribe');
                    }
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={buildAvatarUrl(seed, style)} alt="" width={60} height={60} loading="lazy" />
                  {!isPremium && (
                    <span className="profile__avatar-lock-icon" aria-hidden="true">
                      <Lock size={16} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

    </div>
  );
}
