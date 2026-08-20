'use client';

/**
 * src/components/features/home/HomeScreen.tsx
 *
 * Écran d'accueil post-onboarding.
 * Permet de choisir une catégorie parmi les 5 officielles v1.4 et une difficulté,
 * puis de lancer une partie via le bouton "Jouer !".
 *
 * Flux : sélection catégorie + difficulté → chargement Supabase → startQuiz() → /quiz
 * Le bouton "Jouer !" reste désactivé tant que les deux sélections ne sont pas faites.
 *
 * v1.4 : accès uniforme aux 5 catégories (trial 7 jours ou abonnement) — plus de
 * split gratuit/premium par catégorie comme en v1.0. Le gate d'accès lui-même
 * (redirection paywall) reste à implémenter (Sprint 2, lot bilinguisme/trial).
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Atom, Landmark, Lightbulb, Rocket, Bone, Loader2, WifiOff, Lock } from 'lucide-react';
import { buildAvatarUrl, type AvatarStyle } from '@/lib/avatars';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useQuizStore } from '@/stores/quizStore';
import { fetchQuestions, prewarmQuestionsCache } from '@/lib/questions';
import { getCategoryColor, getCategoryColorDark } from '@/lib/categories';
import { getUnlockedDifficulties } from '@/lib/difficulty';
import { useSubscription } from '@/hooks/useSubscription';
import { useNovaPresence } from '@/hooks/useNovaPresence';
import { useNovaStore } from '@/stores/novaStore';
import type { Category, Difficulty, Locale } from '@/types';

const SLEEP_DELAY_MS = 30_000;

// Les 5 catégories officielles v1.4 (cahier-des-charges-claude-v1.4.md §2)
const CATEGORIES: { id: Category; icon: React.ReactNode; colorVar: string }[] = [
  {
    id: 'histoire-du-monde',
    icon: <Landmark size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-histoire-du-monde)',
  },
  {
    id: 'culture-generale',
    icon: <Lightbulb size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-culture-generale)',
  },
  {
    id: 'sciences-nature',
    icon: <Atom size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-sciences-nature)',
  },
  {
    id: 'dinosaures',
    icon: <Bone size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-dinosaures)',
  },
  {
    id: 'espace',
    icon: <Rocket size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-espace)',
  },
];

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export default function HomeScreen() {
  const t = useTranslations('home');
  const tNova = useTranslations('nova');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  // Toggle FR ↔ EN — même pattern que ProfileScreen
  function toggleLocale() {
    const next: Locale = locale === 'fr' ? 'en' : 'fr';
    router.replace(pathname, { locale: next });
  }

  const profile    = useProfileStore((s) => s.profile);
  const sessions   = useProfileStore((s) => s.sessions);
  const { isPremium } = useSubscription();
  const { showNova, hideNova } = useNovaPresence();

  const { category, difficulty, setCategory, setDifficulty, startQuiz } = useQuizStore();
  const headerColor     = getCategoryColor(category);
  const headerColorDark = getCategoryColorDark(category);

  // Niveaux jouables pour la catégorie sélectionnée (progression par catégorie,
  // cahier-des-charges-claude-v1.4.md §3) — toujours au moins Facile.
  const unlockedDifficulties = useMemo(
    () => (category ? getUnlockedDifficulties(sessions, category) : (['easy'] as Difficulty[])),
    [sessions, category]
  );

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Pré-chauffe le cache questions en arrière-plan dès que HomeScreen monte.
  // Garantit le mode offline lors des visites suivantes, même sans avoir joué.
  useEffect(() => {
    prewarmQuestionsCache();
  }, []);

  // ── Nova : comportements côté enfant ─────────────────────────────────────

  // 1. idle / excited au montage
  useEffect(() => {
    const lastSession = sessions[sessions.length - 1];
    const isReturn = lastSession
      ? Date.now() - new Date(lastSession.playedAt).getTime() > 24 * 60 * 60 * 1000
      : false;

    if (isReturn) {
      // excited 3s → retour à idle permanent
      showNova('excited', tNova('excited'), 3000);
      const backToIdle = setTimeout(() => showNova('idle', '', 0), 3200);
      return () => {
        clearTimeout(backToIdle);
        hideNova();
      };
    }

    showNova('idle', '', 0);
    return () => hideNova();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Premier accès post-premium : excited une seule fois par session
  //    sessionStorage évite le re-déclenchement si l'utilisateur revient sur /home
  useEffect(() => {
    if (!isPremium) return;
    const FLAG = 'nova-premium-welcome-shown';
    if (sessionStorage.getItem(FLAG)) return;
    sessionStorage.setItem(FLAG, '1');
    showNova('excited', tNova('premiumWelcome'), 4000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  // 3. sleeping après 30s d'inactivité — reset sur toute interaction
  useEffect(() => {
    let sleepTimer: ReturnType<typeof setTimeout>;

    function resetTimer() {
      clearTimeout(sleepTimer);
      // Si Nova dormait, la réveiller en idle
      if (useNovaStore.getState().state === 'sleeping') {
        showNova('idle', '', 0);
      }
      sleepTimer = setTimeout(() => {
        showNova('sleeping', tNova('sleeping'), 0);
      }, SLEEP_DELAY_MS);
    }

    const events = ['pointerdown', 'keydown'] as const;
    events.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(sleepTimer);
      events.forEach((e) => document.removeEventListener(e, resetTimer));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref sur le CTA "Jouer !" — pour le scroll automatique sur mobile
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Scroll vers le bouton "Jouer !" dès qu'une catégorie est choisie (mobile uniquement)
  // Sur desktop le CTA est sticky dans le panneau droit, pas besoin de scroller.
  useEffect(() => {
    if (category !== null && ctaRef.current && window.innerWidth < 1024) {
      ctaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [category]);

  const canPlay = category !== null && difficulty !== null;

  async function handlePlay() {
    if (!canPlay || loading) return;

    setLoading(true);
    setFetchError(false);
    try {
      const pool = await fetchQuestions(category!, locale as Locale, difficulty!);
      if (!pool.length) throw new Error('Pool vide — aucune question disponible pour cette difficulté');
      startQuiz(pool);
      router.push('/quiz');
    } catch (err) {
      // RLS Supabase → 0 questions retournées si le trial est expiré et pas d'abonnement actif.
      if ((err as Error & { code?: string }).code === 'ACCESS_REQUIRED' && !isPremium) {
        router.push('/subscribe');
        return;
      }
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home">

      {/* ── Barre de navigation ────────────────────────────────────────────── */}
      <header
        className="home__header"
        style={{
          background: category
            ? `linear-gradient(135deg, ${headerColor}, ${headerColorDark})`
            : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
        }}
      >
        <h1 className="home__greeting">
          {/* Salutation personnalisée avec le pseudo */}
          Salut, <span>{profile?.pseudo}</span> !
        </h1>
        <div className="home__header-actions">
          {/* Toggle langue — accessible directement depuis le header pour les enfants */}
          <button
            className="home__lang-btn"
            onClick={toggleLocale}
            aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en français'}
          >
            {locale === 'fr' ? '🇬🇧' : '🇫🇷'}
          </button>
          <button
            className="home__profile-btn"
            onClick={() => router.push('/profile')}
            aria-label="Voir mon profil"
          >
            {profile ? (
              <Image
                src={buildAvatarUrl(profile.avatarId, profile.avatarStyle as AvatarStyle | undefined)}
                alt={profile.pseudo}
                width={36}
                height={36}
                className="home__profile-avatar"
                unoptimized
              />
            ) : null}
          </button>
        </div>
      </header>

      <main className="home__body">

        {/* ── Les 5 catégories v1.4 ─────────────────────────────────────────── */}
        <section className="home__section">
          <h2 className="home__section-title">{t('title')}</h2>
          <div className="home__categories">
            {CATEGORIES.map(({ id, icon, colorVar }) => (
              <button
                key={id}
                type="button"
                data-testid={`cat-${id}`}
                className={`home__cat-card${category === id ? ' home__cat-card--active' : ''}`}
                style={{ '--cat-color': colorVar } as React.CSSProperties}
                onClick={() => setCategory(id)}
                aria-pressed={category === id}
              >
                <span className="home__cat-icon">{icon}</span>
                <span className="home__cat-name">{t(id)}</span>
                <span className="home__cat-desc">{t(`${id}Desc`)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Panneau de contrôle : difficulté + play ──────────────────────── */}
        {/*
          Sur desktop, ce div devient une colonne sticky à droite du bento grid.
          Sur mobile, display:contents le "dissout" dans le flux flex du body.
        */}
        <div className="home__controls">

          {/* Difficulté */}
          <section className="home__section home__section--difficulty">
            <h2 className="home__section-title">{t('difficultyLabel')}</h2>
            <div className="home__difficulties">
              {DIFFICULTIES.map((d) => {
                const locked = !unlockedDifficulties.includes(d);
                const lockHint = d === 'medium' ? t('diffLockedHintMedium') : t('diffLockedHintHard');
                return (
                  <button
                    key={d}
                    type="button"
                    data-testid={`diff-${d}`}
                    className={`home__diff-btn home__diff-btn--${d}${difficulty === d ? ' home__diff-btn--active' : ''}${locked ? ' home__diff-btn--locked' : ''}`}
                    onClick={() => !locked && setDifficulty(d)}
                    disabled={locked}
                    aria-pressed={difficulty === d}
                    aria-label={locked ? `${t(d)} — ${lockHint}` : t(d)}
                    title={locked ? lockHint : undefined}
                  >
                    {locked && <Lock size={14} strokeWidth={2.5} aria-hidden="true" />}
                    {t(d)}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Aide contextuelle sous le CTA désactivé */}
          {!category && (
            <p className="home__hint" aria-live="polite">{t('hintCategory')}</p>
          )}
          {category && !difficulty && (
            <p className="home__hint" aria-live="polite">{t('hintDifficulty')}</p>
          )}

          {/* CTA Play */}
          <button
            ref={ctaRef}
            type="button"
            data-testid="play-btn"
            className="home__cta"
            disabled={!canPlay || loading}
            onClick={handlePlay}
          >
            {loading
              ? <><Loader2 size={18} className="home__cta-spinner" aria-hidden="true" /> {t('ctaLoading')}</>
              : t('ctaPlay')}
          </button>

          {/* Erreur chargement questions (pas de réseau + pas de cache) */}
          {fetchError && (
            <div className="home__fetch-error" role="alert">
              <WifiOff size={16} aria-hidden="true" />
              <span>{t('fetchError')}</span>
              <button type="button" className="home__retry-btn" onClick={handlePlay}>
                {t('retry')}
              </button>
            </div>
          )}

          {!isPremium && (
            <button
              className="home__premium-cta"
              onClick={() => router.push('/subscribe')}
            >
              {t('premiumUpgrade')}
            </button>
          )}

        </div>

      </main>
    </div>
  );
}
