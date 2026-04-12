'use client';

/**
 * src/components/features/home/HomeScreen.tsx
 *
 * Écran d'accueil post-onboarding.
 * Permet de choisir une catégorie (sciences / histoire / heroes) et une difficulté,
 * puis de lancer une partie via le bouton "Jouer !".
 *
 * Flux : sélection catégorie + difficulté → chargement JSON → startQuiz() → /quiz
 * Le bouton "Jouer !" reste désactivé tant que les deux sélections ne sont pas faites.
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import {
  Atom, Landmark, Swords, Lock,
  Trophy, Globe, Palette, Film, Scale,
  Calculator, ChefHat, Cpu, Sparkles, Rocket, BookA,
  PawPrint, Heart, Music2, Leaf, Bone, ChevronDown,
} from 'lucide-react';
import { buildAvatarUrl, type AvatarStyle } from '@/lib/avatars';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useQuizStore } from '@/stores/quizStore';
import { fetchQuestions, prewarmQuestionsCache } from '@/lib/questions';
import { getCategoryColor, getCategoryColorDark } from '@/lib/categories';
import { useSubscription } from '@/hooks/useSubscription';
import { useNovaPresence } from '@/hooks/useNovaPresence';
import { useNovaStore } from '@/stores/novaStore';
import { getUnlockedMythSubcategories } from '@/lib/mythology';
import DailyBanner from './DailyBanner';
import MythologyPanel from './MythologyPanel';
import type { Category, Difficulty, Locale, MythSubcategory } from '@/types';

const SLEEP_DELAY_MS = 30_000;


// Catégories jouables — questions disponibles (gratuites)
const CATEGORIES: { id: Category; icon: React.ReactNode; colorVar: string }[] = [
  {
    id: 'sciences',
    icon: <Atom size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-science)',
  },
  {
    id: 'histoire',
    icon: <Landmark size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-history)',
  },
  {
    id: 'heroes',
    icon: <Swords size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-heroes)',
  },
  {
    id: 'animaux-nature',
    icon: <PawPrint size={40} strokeWidth={1.5} />,
    colorVar: 'var(--color-cat-animaux)',
  },
];

// Catégories premium — toutes ont un id (questions disponibles).
// Logique binaire : cadenas pour l'user gratuit, jouable pour le premium.
// Les catégories sans questions sont masquées jusqu'à ce que leur contenu soit prêt.
const PREMIUM_CATEGORIES: { i18nKey: string; icon: React.ReactNode; colorVar: string; id: Category }[] = [
  { i18nKey: 'sport',          icon: <Trophy    size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-sport)',      id: 'sport' },
  { i18nKey: 'geographie',     icon: <Globe     size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-geography)',  id: 'geographie' },
  { i18nKey: 'mathematiques',  icon: <Calculator size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-maths)',    id: 'math' },
  { i18nKey: 'langueFr',       icon: <BookA     size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-langue-fr)', id: 'francais' },
  { i18nKey: 'langueEn',       icon: <BookA     size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-langue-en)', id: 'anglais' },
  { i18nKey: 'art',            icon: <Palette   size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-art)',        id: 'art' },
  { i18nKey: 'civique',        icon: <Scale     size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-civique)',    id: 'education-civique' },
  { i18nKey: 'cuisine',        icon: <ChefHat   size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-cuisine)',    id: 'cuisine' },
  { i18nKey: 'corpsHumain',    icon: <Heart     size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-corps)',      id: 'corps-humain' },
  { i18nKey: 'environnement',  icon: <Leaf      size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-enviro)',     id: 'environnement' },
  { i18nKey: 'dinosaures',     icon: <Bone      size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-dino)',       id: 'dinosaures' },
  // mythologie est géré séparément (carte expandable avec sous-catégories)
  { i18nKey: 'espace',         icon: <Rocket    size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-espace)',     id: 'espace-astronomie' },
  { i18nKey: 'culturePop',     icon: <Film      size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-culture)',    id: 'pop-culture' },
  { i18nKey: 'technologie',    icon: <Cpu       size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-techno)',     id: 'technologie' },
  { i18nKey: 'musique',        icon: <Music2    size={36} strokeWidth={1.5} />, colorVar: 'var(--color-cat-musique)',    id: 'musique' },
];

// Catégorie mythologie — gérée séparément pour les sous-catégories
const MYTH_COLOR_VAR = 'var(--color-cat-mythologie)';

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

  const { category, difficulty, subcategory, setCategory, setDifficulty, setSubcategory, startQuiz } = useQuizStore();
  const headerColor     = getCategoryColor(category);
  const headerColorDark = getCategoryColorDark(category);

  // ── Mythologie : état du tiroir de sous-catégories ────────────────────────
  const [mythOpen, setMythOpen] = useState(false);
  const unlockedMythSubs = getUnlockedMythSubcategories(sessions, isPremium);

  function handleMythSelect(sub: MythSubcategory) {
    setCategory('mythology');
    setSubcategory(sub);
  }

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

  // mythology : canPlay nécessite aussi une sous-catégorie sélectionnée
  const canPlay = category !== null && difficulty !== null
    && (category !== 'mythology' || subcategory !== null);

  async function handlePlay() {
    if (!canPlay || loading) return;

    setLoading(true);
    setFetchError(false);
    try {
      const pool = await fetchQuestions(
        category!,
        locale as Locale,
        difficulty!,
        subcategory ?? undefined,
      );
      if (!pool.length) throw new Error('Pool vide — aucune question disponible pour cette difficulté');
      startQuiz(pool);
      router.push('/quiz');
    } catch (err) {
      // RLS Supabase → 0 questions retournées pour une catégorie premium sans abonnement.
      // Ne rediriger vers /subscribe que si l'utilisateur N'est PAS premium —
      // un premium qui obtient 0 résultats a un problème de données (questions non migrées),
      // pas d'abonnement manquant.
      if ((err as Error & { code?: string }).code === 'PREMIUM_REQUIRED' && !isPremium) {
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
        style={{ background: `linear-gradient(135deg, ${headerColor}, ${headerColorDark})` }}
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

        {/* ── Banners Défi Quotidien + Mode Défi — masqué UI (code conservé) */}
        {/* <DailyBanner /> */}

        {/* ── Catégories gratuites ──────────────────────────────────────────── */}
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
                onClick={() => { setMythOpen(false); setSubcategory(null); setCategory(id); }}
                aria-pressed={category === id}
              >
                <span className="home__cat-icon">{icon}</span>
                <span className="home__cat-name">{t(id)}</span>
                <span className="home__cat-desc">{t(`${id}Desc`)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Catégories premium ────────────────────────────────────────────── */}
        {/* Pas de titre : le cadenas + fond gris des cartes locked suffit à signifier Premium */}
        <section className="home__section home__section--premium">

          {/* ── Mythologie : masquée en UI — reportée à MVP 5 post-lancement ── */}
          {/* Remplacer false par true pour réactiver la carte mythologie */}
          {false && (
          <div className="home__myth-wrapper">
            <button
              type="button"
              className={[
                'home__cat-card',
                'home__cat-card--myth',
                category === 'mythology' ? 'home__cat-card--selected' : '',
                !isPremium ? 'home__cat-card--locked-cta' : '',
              ].filter(Boolean).join(' ')}
              style={{ '--cat-color': MYTH_COLOR_VAR } as React.CSSProperties}
              aria-expanded={mythOpen}
              aria-controls="myth-panel"
              onClick={() => {
                if (!isPremium) {
                  showNova('encouragement', tNova('premiumHint'), 3000);
                  return;
                }
                setMythOpen((prev) => !prev);
                if (mythOpen) setSubcategory(null);
              }}
            >
              <span className="home__cat-icon">
                <Sparkles size={36} strokeWidth={1.5} />
              </span>
              <span className="home__cat-name">{t('mythologie')}</span>
              {!isPremium && (
                <span className="home__cat-lock" aria-hidden="true">
                  <Lock size={18} strokeWidth={2.5} />
                </span>
              )}
              {isPremium && (
                <ChevronDown
                  size={16}
                  className={`home__myth-chevron${mythOpen ? ' home__myth-chevron--open' : ''}`}
                  aria-hidden="true"
                />
              )}
            </button>

            {isPremium && mythOpen && (
              <div id="myth-panel" className="home__myth-panel">
                <MythologyPanel
                  sessions={sessions}
                  isPremium={isPremium}
                  unlockedSubcategories={unlockedMythSubs}
                  selectedSubcategory={subcategory}
                  onSelect={handleMythSelect}
                  onSubscribe={() => router.push('/subscribe')}
                />
              </div>
            )}
          </div>
          )}

          <div className="home__categories">
            {PREMIUM_CATEGORIES.map(({ i18nKey, icon, colorVar, id }) => {
              // Premium → jouable
              if (isPremium) {
                return (
                  <button
                    key={i18nKey}
                    type="button"
                    className={`home__cat-card${category === id ? ' home__cat-card--selected' : ''}`}
                    style={{ '--cat-color': colorVar } as React.CSSProperties}
                    onClick={() => { setMythOpen(false); setSubcategory(null); setCategory(id); }}
                    aria-pressed={category === id}
                    aria-label={t(i18nKey)}
                  >
                    <span className="home__cat-icon">{icon}</span>
                    <span className="home__cat-name">{t(i18nKey)}</span>
                  </button>
                );
              }

              // Non-premium → cadenas cliquable, Nova encouragement
              return (
                <button
                  key={i18nKey}
                  type="button"
                  className="home__cat-card home__cat-card--locked-cta"
                  style={{ '--cat-color': colorVar } as React.CSSProperties}
                  aria-label={`${t(i18nKey)} — ${t('premiumLocked')}`}
                  onClick={() => showNova('encouragement', tNova('premiumHint'), 3000)}
                >
                  <span className="home__cat-icon">{icon}</span>
                  <span className="home__cat-name">{t(i18nKey)}</span>
                  <span className="home__cat-lock" aria-hidden="true">
                    <Lock size={18} strokeWidth={2.5} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section "Bientôt" supprimée — les catégories sans contenu sont désormais
            intégrées dans la section premium avec le badge 🚀 (PREMIUM_CATEGORIES sans id) */}

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
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  data-testid={`diff-${d}`}
                  className={`home__diff-btn home__diff-btn--${d}${difficulty === d ? ' home__diff-btn--active' : ''}`}
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                >
                  {t(d)}
                </button>
              ))}
            </div>
          </section>

          {/* CTA Play */}
          <button
            ref={ctaRef}
            type="button"
            data-testid="play-btn"
            className="home__cta"
            disabled={!canPlay || loading}
            onClick={handlePlay}
          >
            {loading ? '…' : t('ctaPlay')}
          </button>

          {/* Erreur chargement questions (pas de réseau + pas de cache) */}
          {fetchError && (
            <p className="home__fetch-error" role="alert">{t('fetchError')}</p>
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
