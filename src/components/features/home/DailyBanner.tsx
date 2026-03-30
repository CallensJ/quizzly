'use client';

/**
 * src/components/features/home/DailyBanner.tsx
 *
 * Banners de l'écran d'accueil :
 *   1. Défi quotidien — toujours visible, état "déjà joué" si dailyLastDate = aujourd'hui
 *   2. Mode Défi multijoueur — visible uniquement si multiplayerUnlocked
 */

import { useTranslations } from 'next-intl';
import { Sun, Flame, ChevronRight, Swords } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { getDailyDateString } from '@/lib/daily';

export default function DailyBanner() {
  const t      = useTranslations('home');
  const router = useRouter();

  const dailyStreak         = useProfileStore((s) => s.dailyStreak);
  const dailyLastDate       = useProfileStore((s) => s.dailyLastDate);
  const multiplayerUnlocked = useProfileStore((s) => s.multiplayerUnlocked);
  const alreadyPlayedToday  = dailyLastDate === getDailyDateString();

  return (
    <>
      {/* Banner Défi quotidien */}
      <section className="home__section">
        <button
          type="button"
          className={`home__daily-banner${alreadyPlayedToday ? ' home__daily-banner--done' : ''}`}
          onClick={() => router.push('/daily')}
          aria-label={t('dailyAriaLabel')}
        >
          <Sun size={28} className="home__daily-sun" aria-hidden="true" />
          <div className="home__daily-content">
            <span className="home__daily-label">{t('dailyTitle')}</span>
            <span className="home__daily-sub">
              {alreadyPlayedToday ? t('dailyDone') : t('dailyPlay')}
            </span>
          </div>
          {dailyStreak > 0 && (
            <div className="home__daily-streak">
              <Flame size={16} aria-hidden="true" />
              <span>{dailyStreak}</span>
            </div>
          )}
          {!alreadyPlayedToday && (
            <ChevronRight size={20} className="home__daily-chevron" aria-hidden="true" />
          )}
        </button>
      </section>

      {/* Banner Mode Défi — mobile only (sidebar gère desktop) */}
      {multiplayerUnlocked && (
        <section className="home__section home__section--challenges-mobile">
          <button
            type="button"
            className="home__challenges-banner"
            onClick={() => router.push('/challenges')}
            aria-label={t('challengesBannerLabel')}
          >
            <Swords size={24} className="home__challenges-icon" aria-hidden="true" />
            <div className="home__daily-content">
              <span className="home__daily-label">{t('challengesBannerLabel')}</span>
              <span className="home__daily-sub">{t('challengesBannerSub')}</span>
            </div>
            <ChevronRight size={20} className="home__daily-chevron" aria-hidden="true" />
          </button>
        </section>
      )}
    </>
  );
}
