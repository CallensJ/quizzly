'use client';

/**
 * src/components/features/onboarding/OnboardingScreen.tsx
 *
 * Écran d'onboarding — affiché au premier lancement (aucun profil en localStorage).
 * Recueille : pseudo (≥ 2 chars) + avatar DiceBear.
 * Le toggle de langue est accessible directement sur cet écran.
 *
 * La tranche d'âge a été supprimée (MVP 4) — l'app cible 6-11 ans, le niveau
 * de difficulté est choisi par le joueur lui-même sur l'écran Home.
 *
 * À la confirmation, createProfile() persiste le profil via Zustand → localStorage.
 * Pas de validation email/nom réel (conformité COPPA).
 */

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { syncProfile } from '@/lib/sync';
import { useNovaPresence } from '@/hooks/useNovaPresence';
import type { Locale } from '@/types';
import { FREE_SEEDS, FREE_STYLE, buildAvatarUrl } from '@/lib/avatars';

export default function OnboardingScreen() {
  const t = useTranslations('onboarding');
  const tNova = useTranslations('nova');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const createProfile = useProfileStore((s) => s.createProfile);
  const setLocale = useProfileStore((s) => s.setLocale);
  const { showNova, hideNova } = useNovaPresence();

  const [pseudo, setPseudo] = useState('');
  const [avatarId, setAvatarId] = useState<string | null>(null);

  // Nova : welcome à l'arrivée (3s), puis disparaît
  useEffect(() => {
    showNova('welcome', tNova('welcome'), 3000);
    return () => hideNova();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le CTA n'est actif que si pseudo + avatar sont remplis
  const canSubmit = pseudo.trim().length >= 2 && avatarId !== null;

  function handleSubmit() {
    if (!canSubmit) return;
    createProfile({
      pseudo: pseudo.trim(),
      avatarId: avatarId!,
      avatarStyle: FREE_STYLE, // adventurer — style gratuit par défaut
      badgeEarned: false,
      locale,
    });
    // Sync Supabase en arrière-plan — fire-and-forget (local-first)
    // On lit l'état frais depuis le store car createProfile génère le deviceId synchroniquement
    const { deviceId, profile, dailyGoal } = useProfileStore.getState();
    if (deviceId && profile) {
      syncProfile(deviceId, profile, dailyGoal);
    }
    // TODO MVP1 : rediriger vers /home une fois l'écran Home implémenté
  }

  function toggleLocale() {
    const next: Locale = locale === 'fr' ? 'en' : 'fr';
    // Persist la préférence langue même avant la création du profil
    setLocale(next);
    // next-intl remplace la locale dans l'URL sans changer la route
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="onboarding">

      <header className="onboarding__header">
        {/* Toggle langue — accessible dès l'onboarding (contrainte MVP 1) */}
        <button
          className="onboarding__lang-toggle"
          onClick={toggleLocale}
          aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en français'}
        >
          {locale === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
        </button>

        <h1 className="onboarding__title">{t('title')}</h1>
      </header>

      <main className="onboarding__body">

        {/* ── Pseudo ──────────────────────────────────────────────────────── */}
        <section className="onboarding__section">
          <label htmlFor="pseudo" className="onboarding__label">
            {t('pseudoLabel')}
          </label>
          <input
            id="pseudo"
            data-testid="pseudo-input"
            type="text"
            className="onboarding__input"
            placeholder={t('pseudoPlaceholder')}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            maxLength={20}
            autoComplete="off"
            spellCheck={false}
          />
        </section>

        {/* ── Galerie d'avatars ────────────────────────────────────────────── */}
        <section className="onboarding__section">
          <p className="onboarding__label">{t('avatarLabel')}</p>
          {/* role="list" requis car list-style: none retire la sémantique sur Safari (cf. reset) */}
          <div className="onboarding__avatar-grid" role="list">
            {FREE_SEEDS.map((seed) => (
              <button
                key={seed}
                type="button"
                data-testid={`avatar-${seed}`}
                className={`onboarding__avatar-btn${avatarId === seed ? ' onboarding__avatar-btn--active' : ''}`}
                onClick={() => {
                  setAvatarId(seed);
                  // Nova réagit à la sélection d'avatar — état curious, 2s
                  showNova('curious', tNova('curious'), 2000);
                }}
                aria-label={seed}
                aria-pressed={avatarId === seed}
              >
                <Image
                  src={buildAvatarUrl(seed)}
                  alt=""
                  width={72}
                  height={72}
                  unoptimized
                />
              </button>
            ))}
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <button
          type="button"
          data-testid="confirm-btn"
          className="onboarding__cta"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {t('ctaConfirm')}
        </button>

      </main>
    </div>
  );
}
