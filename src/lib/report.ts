/**
 * src/lib/report.ts
 *
 * Préparation des données pour le rapport de progression PDF.
 * Centralise le calcul des stats agrégées (total, par catégorie, sessions récentes)
 * et la résolution des badges gagnés avec leurs emojis.
 *
 * Utilisé par ReportSection.tsx pour générer le PDF côté client
 * et par l'Edge Function send-report pour construire l'email.
 */

import type { QuizSession, Category } from '@/types';
import { getTitleForXp } from './daily';
import { BADGE_DEFINITIONS } from './badges';

// ─── Type de planification ─────────────────────────────────────────────────────

export type ReportSchedule = 'none' | 'weekly' | 'monthly';

// ─── Structures de données du rapport ─────────────────────────────────────────

export interface CategoryStats {
  games: number;
  bestPct: number | null;  // 0-100
  avgPct: number | null;   // 0-100
}

/** Badge résolu avec emoji et libellé bilingue — évite la dépendance à next-intl dans le PDF */
export interface ReportBadge {
  id: string;
  emoji: string;
  name_fr: string;
  name_en: string;
}

export interface ReportData {
  generatedAt: string;                          // ISO 8601
  pseudo: string;
  locale: string;                               // 'fr' | 'en'
  totalGames: number;
  totalPoints: number;
  bestScorePct: number | null;                  // 0-100
  earnedBadges: ReportBadge[];
  totalBadgeCount: number;
  dailyStreak: number;
  dailyXp: number;
  dailyTitleEmoji: string;
  dailyTitleKey: string;                        // ex: 'sage' → clé i18n daily.title_sage
  categoryStats: Record<Category, CategoryStats>;
  recentSessions: QuizSession[];                // 10 dernières, ordre anti-chronologique
}

// ─── Libellés de badges embarqués (pas de dépendance next-intl côté PDF) ──────

const BADGE_NAMES: Record<string, { fr: string; en: string }> = {
  first_game:   { fr: 'Première partie',    en: 'First game' },
  good_score:   { fr: 'Bon élève',          en: 'Good student' },
  expert:       { fr: 'Expert',             en: 'Expert' },
  perfect:      { fr: 'Sans faute',         en: 'Perfect' },
  games_5:      { fr: 'Assidu',             en: 'Diligent' },
  games_20:     { fr: 'Marathonien',        en: 'Marathon runner' },
  scientist:    { fr: 'Scientifique',       en: 'Scientist' },
  historian:    { fr: 'Historien',          en: 'Historian' },
  hero_fan:     { fr: 'Fan de héros',       en: 'Hero fan' },
  brave:        { fr: 'Courageux',          en: 'Brave' },
  hard_expert:  { fr: 'Guerrier',           en: 'Warrior' },
  streak_3:     { fr: 'En feu !',           en: 'On fire!' },
  streak_7:     { fr: 'Etoile montante',    en: 'Rising star' },
  streak_30:    { fr: 'Legende du savoir',  en: 'Legend of knowledge' },
};

const CATEGORIES: Category[] = ['sciences', 'histoire', 'heroes'];

// ─── Constructeur du rapport ───────────────────────────────────────────────────

/**
 * Agrège toutes les données du store Zustand en un objet plat prêt pour le PDF.
 * Appelé depuis ReportSection.tsx juste avant la génération du PDF.
 */
export function buildReportData(params: {
  pseudo: string;
  locale: string;
  sessions: QuizSession[];
  earnedBadgeIds: string[];
  dailyStreak: number;
  dailyXp: number;
}): ReportData {
  const { pseudo, locale, sessions, earnedBadgeIds, dailyStreak, dailyXp } = params;

  // Stats globales
  const totalGames  = sessions.length;
  const totalPoints = sessions.reduce((sum, s) => sum + s.score, 0);
  const bestScorePct = sessions.length
    ? Math.round(Math.max(...sessions.map((s) => s.score / s.totalQuestions)) * 100)
    : null;

  // Stats par catégorie
  const categoryStats = {} as Record<Category, CategoryStats>;
  for (const cat of CATEGORIES) {
    const cs = sessions.filter((s) => s.category === cat);
    categoryStats[cat] = {
      games: cs.length,
      bestPct: cs.length
        ? Math.round(Math.max(...cs.map((s) => s.score / s.totalQuestions)) * 100)
        : null,
      avgPct: cs.length
        ? Math.round(
            cs.reduce((sum, s) => sum + (s.score / s.totalQuestions), 0) / cs.length * 100
          )
        : null,
    };
  }

  // Badges gagnés — résolution emoji + libellés bilingues
  const earnedBadges: ReportBadge[] = BADGE_DEFINITIONS
    .filter((b) => earnedBadgeIds.includes(b.id))
    .map((b) => ({
      id:      b.id,
      emoji:   b.emoji,
      name_fr: BADGE_NAMES[b.id]?.fr ?? b.id,
      name_en: BADGE_NAMES[b.id]?.en ?? b.id,
    }));

  // Titre défi quotidien
  const title = getTitleForXp(dailyXp);

  return {
    generatedAt:    new Date().toISOString(),
    pseudo,
    locale,
    totalGames,
    totalPoints,
    bestScorePct,
    earnedBadges,
    totalBadgeCount: BADGE_DEFINITIONS.length,
    dailyStreak,
    dailyXp,
    dailyTitleEmoji: title.emoji,
    dailyTitleKey:   title.id,
    categoryStats,
    recentSessions: [...sessions]
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
      .slice(0, 10),
  };
}
