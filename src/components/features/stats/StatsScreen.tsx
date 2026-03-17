'use client';

/**
 * src/components/features/stats/StatsScreen.tsx
 *
 * Écran statistiques détaillées du joueur.
 *
 * Sections :
 *   1. Résumé global — 3 pills (parties, points, meilleur %)
 *   2. Progression récente — BarChart Recharts (10 dernières sessions, score %)
 *   3. Par catégorie — barres CSS + avg/best calculés depuis sessions[]
 *   4. Par difficulté — PieChart Recharts (répartition des parties jouées)
 *
 * Architecture graphes :
 *   - Recharts (BarChart + PieChart) pour les visuels animés
 *   - ResponsiveContainer garantit le redimensionnement fluide
 *   - CSS pur pour les barres de progression par catégorie (3 items seulement)
 *
 * Données source : profileStore.sessions[] — persisté en localStorage
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, BarChart2, BookOpen, Trophy } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import type { Category, Difficulty } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ─── Constantes ─────────────────────────────────────────────────────────────

// Couleurs issues du design system
const CAT_COLORS: Record<Category, string> = {
  sciences: '#2196F3',
  histoire: '#795548',
  heroes:   '#E91E63',
};

const DIFF_COLORS: Record<Difficulty, string> = {
  easy:   '#4CAF50',
  medium: '#FF9800',
  hard:   '#F44336',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formate une date ISO en label court pour l'axe X du BarChart.
 * Ex: "2026-03-14T10:00:00Z" → "14/03"
 */
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calcule le score en % arrondi à l'entier.
 */
function pct(score: number, total: number): number {
  return Math.round((score / total) * 100);
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function StatsScreen() {
  const t = useTranslations('stats');
  const router = useRouter();
  const sessions = useProfileStore((s) => s.sessions);

  // ── Résumé global ─────────────────────────────────────────────────────────
  const totalGames  = sessions.length;
  const totalPoints = sessions.reduce((acc, s) => acc + s.score, 0);
  const bestPct     = sessions.length
    ? Math.max(...sessions.map((s) => pct(s.score, s.totalQuestions)))
    : null;

  // ── Données BarChart — 10 dernières sessions ──────────────────────────────
  const recentData = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())
      .slice(-10)
      .map((s, i) => ({
        name: shortDate(s.playedAt),
        score: pct(s.score, s.totalQuestions),
        // couleur de barre selon la catégorie de la session
        fill: CAT_COLORS[s.category],
        // index pour tooltip unique
        index: i,
      }));
  }, [sessions]);

  // ── Stats par catégorie ───────────────────────────────────────────────────
  const catData = useMemo(() => {
    const categories: Category[] = ['sciences', 'histoire', 'heroes'];
    return categories.map((cat) => {
      const catSessions = sessions.filter((s) => s.category === cat);
      if (!catSessions.length) return { cat, games: 0, avg: null, best: null };
      const scores = catSessions.map((s) => pct(s.score, s.totalQuestions));
      const avg  = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const best = Math.max(...scores);
      return { cat, games: catSessions.length, avg, best };
    });
  }, [sessions]);

  // ── Données PieChart — répartition par difficulté ─────────────────────────
  const diffData = useMemo(() => {
    const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
    sessions.forEach((s) => { counts[s.difficulty] += 1; });
    return (['easy', 'medium', 'hard'] as Difficulty[])
      .filter((d) => counts[d] > 0)
      .map((d) => ({ name: d, value: counts[d], color: DIFF_COLORS[d] }));
  }, [sessions]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="stats">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="stats__header">
        <button
          type="button"
          className="stats__back-btn"
          onClick={() => router.push('/profile')}
          aria-label={t('ctaBack')}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="stats__title">
          <BarChart2 size={22} strokeWidth={2.5} aria-hidden="true" />
          {t('title')}
        </h1>
        <div className="stats__header-spacer" aria-hidden="true" />
      </header>

      <main className="stats__body">

        {/* ── Cas : aucune session ──────────────────────────────────────── */}
        {totalGames === 0 ? (
          <div className="stats__empty">
            <span className="stats__empty-icon" aria-hidden="true">🎮</span>
            <p className="stats__empty-text">{t('noData')}</p>
          </div>
        ) : (
          <>
            {/* ── Résumé global ─────────────────────────────────────────── */}
            <section className="stats__summary" aria-label="Résumé">
              <div className="stats__summary-card">
                <span className="stats__summary-value">{totalGames}</span>
                <span className="stats__summary-label">
                  <BookOpen size={14} aria-hidden="true" />
                  {t('games', { count: totalGames })}
                </span>
              </div>
              <div className="stats__summary-card">
                <span className="stats__summary-value">{totalPoints}</span>
                <span className="stats__summary-label">
                  <Trophy size={14} aria-hidden="true" />
                  Points
                </span>
              </div>
              <div className="stats__summary-card stats__summary-card--highlight">
                <span className="stats__summary-value">
                  {bestPct !== null ? `${bestPct}%` : '—'}
                </span>
                <span className="stats__summary-label">{t('bestScore')}</span>
              </div>
            </section>

            {/* ── Progression récente ───────────────────────────────────── */}
            <section className="stats__section" aria-label={t('recentGames')}>
              <h2 className="stats__section-title">{t('recentGames')}</h2>
              <div className="stats__chart-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={recentData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${value ?? 0}%`, t('scoreLabel')]}
                      contentStyle={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '13px',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      }}
                    />
                    {/* Chaque barre prend la couleur de la catégorie jouée */}
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {recentData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* ── Par catégorie — barres CSS ────────────────────────────── */}
            <section className="stats__section" aria-label={t('byCategory')}>
              <h2 className="stats__section-title">{t('byCategory')}</h2>
              <div className="stats__cat-list">
                {catData.map(({ cat, games, avg, best }) => (
                  <div key={cat} className="stats__cat-item">
                    <div className="stats__cat-header">
                      <span
                        className="stats__cat-dot"
                        style={{ background: CAT_COLORS[cat] }}
                        aria-hidden="true"
                      />
                      <span className="stats__cat-name">{t(cat as 'sciences' | 'histoire' | 'heroes')}</span>
                      <span className="stats__cat-meta">
                        {games > 0
                          ? `${t('avgScore')} ${avg}% · ${t('bestScore')} ${best}%`
                          : t('noGamesCategory')}
                      </span>
                    </div>
                    {/* Barre de progression = score moyen */}
                    <div className="stats__cat-bar-track" role="progressbar" aria-valuenow={avg ?? 0} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className="stats__cat-bar-fill"
                        style={{
                          width: `${avg ?? 0}%`,
                          background: CAT_COLORS[cat],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Par difficulté — PieChart ─────────────────────────────── */}
            {diffData.length > 0 && (
              <section className="stats__section" aria-label={t('byDifficulty')}>
                <h2 className="stats__section-title">{t('byDifficulty')}</h2>
                <div className="stats__diff-wrap">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={diffData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {diffData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${value ?? 0} ${t('games', { count: Number(value ?? 0) })}`,
                          t((name as string) as 'easy' | 'medium' | 'hard'),
                        ]}
                        contentStyle={{
                          fontFamily: 'Nunito, sans-serif',
                          fontSize: '13px',
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Légende manuelle — plus lisible qu'une Recharts Legend pour les enfants */}
                  <div className="stats__diff-legend">
                    {diffData.map(({ name, value, color }) => (
                      <div key={name} className="stats__diff-legend-item">
                        <span className="stats__diff-dot" style={{ background: color }} aria-hidden="true" />
                        <span className="stats__diff-label">
                          {t(name as 'easy' | 'medium' | 'hard')}
                        </span>
                        <span className="stats__diff-count">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ── CTA retour ────────────────────────────────────────────────── */}
        <button
          type="button"
          className="stats__cta-back"
          onClick={() => router.push('/profile')}
        >
          {t('ctaBack')}
        </button>

      </main>
    </div>
  );
}
