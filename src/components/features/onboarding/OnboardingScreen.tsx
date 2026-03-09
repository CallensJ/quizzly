'use client';

/**
 * src/components/features/onboarding/OnboardingScreen.tsx
 *
 * Écran d'onboarding — affiché au premier lancement (aucun profil en localStorage).
 * Recueille : pseudo (≥ 2 chars), tranche d'âge (6-9 / 10-13), avatar DiceBear.
 * Le toggle de langue est accessible directement sur cet écran.
 *
 * À la confirmation, createProfile() persiste le profil via Zustand → localStorage.
 * Pas de validation email/nom réel (conformité COPPA).
 */

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { syncProfile } from '@/lib/sync';
import Nova from '@/components/ui/Nova';
import type { AgeGroup, Locale } from '@/types';

// Seeds DiceBear prédéfinis — style "adventurer" (v9)
// Choix fixés pour ne pas dépendre d'une saisie utilisateur
const AVATAR_SEEDS = ['Milo', 'Zara', 'Felix', 'Luna', 'Sam', 'Ava', 'Kai', 'Lily'];

// Fond pastel aléatoire parmi 5 couleurs douces
const BG_COLORS = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';

function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=${BG_COLORS}`;
}

export default function OnboardingScreen() {
  const t = useTranslations('onboarding');
  const tNova = useTranslations('nova');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const createProfile = useProfileStore((s) => s.createProfile);
  const setLocale = useProfileStore((s) => s.setLocale);

  const [pseudo, setPseudo] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);

  // Nova : accueil à l'arrivée sur l'écran, disparaît après 3s
  const [novaVisible, setNovaVisible] = useState(true);

  // Le CTA n'est actif que si tous les champs sont remplis
  const canSubmit = pseudo.trim().length >= 2 && ageGroup !== null && avatarId !== null;

  function handleSubmit() {
    if (!canSubmit) return;
    createProfile({
      pseudo: pseudo.trim(),
      ageGroup: ageGroup!,
      avatarId: avatarId!,
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

      {/* Nova accueille l'enfant à l'arrivée — overlay bas-droite, disparaît après 3s */}
      <Nova
        state="welcome"
        message={tNova('welcome')}
        visible={novaVisible}
        onHide={() => setNovaVisible(false)}
        duration={3000}
      />

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

        {/* ── Tranche d'âge ───────────────────────────────────────────────── */}
        <section className="onboarding__section">
          <p className="onboarding__label">{t('ageLabel')}</p>
          <div className="onboarding__age-group">
            {(['6-9', '10-13'] as AgeGroup[]).map((group) => (
              <button
                key={group}
                type="button"
                data-testid={`age-${group}`}
                className={`onboarding__age-btn${ageGroup === group ? ' onboarding__age-btn--active' : ''}`}
                onClick={() => setAgeGroup(group)}
                aria-pressed={ageGroup === group}
              >
                {group === '6-9' ? t('age6to9') : t('age10to13')}
              </button>
            ))}
          </div>
        </section>

        {/* ── Galerie d'avatars ────────────────────────────────────────────── */}
        <section className="onboarding__section">
          <p className="onboarding__label">{t('avatarLabel')}</p>
          {/* role="list" requis car list-style: none retire la sémantique sur Safari (cf. reset) */}
          <div className="onboarding__avatar-grid" role="list">
            {AVATAR_SEEDS.map((seed) => (
              <button
                key={seed}
                type="button"
                data-testid={`avatar-${seed}`}
                className={`onboarding__avatar-btn${avatarId === seed ? ' onboarding__avatar-btn--active' : ''}`}
                onClick={() => setAvatarId(seed)}
                aria-label={seed}
                aria-pressed={avatarId === seed}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(seed)}
                  alt=""          // décoratif — l'aria-label du bouton suffit
                  width={72}
                  height={72}
                  loading="lazy"
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
