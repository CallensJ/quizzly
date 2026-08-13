'use client';

/**
 * src/components/features/admin/DashboardScreen.tsx
 *
 * Dashboard avancé parent (MVP 4 — Premium).
 * Accessible depuis AdminScreen → montre la progression de l'enfant actif dans le temps.
 *
 * Sections :
 *   1. Filtre période (7 jours / 30 jours / tout)
 *   2. KPIs — 4 cards (parties, points, meilleur %, streak)
 *   3. LineChart tendance — score% par session + ligne de régression linéaire
 *   4. BarChart activité — nombre de parties par semaine (8 dernières semaines)
 *   5. Évolution par catégorie — comparaison avg "premières N parties" vs "dernières N parties"
 *
 * Données : profileStore.sessions[] (profil actif) + dailyStreak (série)
 * Librairie graphes : Recharts (déjà installée pour StatsScreen)
 */

import { useMemo, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, TrendingUp, Gamepad2, Star, Flame, BarChart3 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/stores/profileStore';
import { useNovaPresence } from '@/hooks/useNovaPresence';
import type { Category } from '@/types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

// ─── Constantes ──────────────────────────────────────────────────────────────

const CAT_COLORS: Record<Category, string> = {
  sciences:            '#2196F3',
  histoire:            '#795548',
  heroes:              '#E91E63',
  'animaux-nature':    '#8BC34A',
  math:                '#FF9800',
  sport:               '#4CAF50',
  geographie:          '#00BCD4',
  francais:            '#795548',
  anglais:             '#C62828',
  art:                 '#FF5722',
  'corps-humain':      '#E91E63',
  cuisine:             '#FF9800',
  dinosaures:          '#6D4C41',
  'education-civique': '#607D8B',
  environnement:       '#2E7D32',
  'espace-astronomie': '#1A237E',
  musique:             '#F06292',
  'pop-culture':       '#FF4081',
  technologie:         '#009688',
  'monde-antique':     '#8B4513',
};

// Périodes de filtre
type Period = '7j' | '30j' | 'all';
const PERIODS: { id: Period; label: string }[] = [
  { id: '7j',  label: '7 jours' },
  { id: '30j', label: '30 jours' },
  { id: 'all', label: 'Tout' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(score: number, total: number): number {
  return Math.round((score / total) * 100);
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calcule la régression linéaire (moindres carrés) sur un tableau de valeurs.
 * Retourne un tableau de valeurs prédites (même longueur).
 */
function linearRegression(values: number[]): number[] {
  const n = values.length;
  if (n < 2) return values;
  const xs = values.map((_, i) => i);
  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * values[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return values.map(() => sumY / n);
  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return xs.map((x) => Math.round(Math.max(0, Math.min(100, slope * x + intercept))));
}

/**
 * Retourne le libellé de la semaine ISO pour affichage.
 * Ex: "S12" pour la 12ème semaine de l'année.
 */
function weekLabel(iso: string): string {
  const d = new Date(iso);
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const week = Math.ceil((dayOfYear + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
  return `S${week}`;
}

/**
 * Regroupe les sessions par semaine (libellé), retourne les 8 dernières semaines.
 */
function groupByWeek(sessions: ReturnType<typeof useProfileStore.getState>['sessions']) {
  const map: Record<string, number> = {};
  sessions.forEach((s) => {
    const label = weekLabel(s.playedAt);
    map[label] = (map[label] ?? 0) + 1;
  });
  const entries = Object.entries(map).sort(([a], [b]) => {
    const na = Number(a.slice(1));
    const nb = Number(b.slice(1));
    return na - nb;
  });
  return entries.slice(-8).map(([name, count]) => ({ name, count }));
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function DashboardScreen() {
  const t       = useTranslations('dashboard');
  const tNova   = useTranslations('nova');
  const router  = useRouter();
  const profile       = useProfileStore((s) => s.profile);
  const sessions      = useProfileStore((s) => s.sessions);
  const dailyStreak   = useProfileStore((s) => s.dailyStreak);
  const { showNova, hideNova } = useNovaPresence();

  const [period, setPeriod] = useState<Period>('30j');

  // ── Nova : état contextuel au montage ─────────────────────────────────────
  // Priorité : badge (objectif atteint) > streak (bonne semaine) > curious (0 sessions)
  useEffect(() => {
    if (sessions.length === 0) {
      showNova('curious', tNova('dashboardCurious'), 4000);
      return () => hideNova();
    }

    // Bonne semaine : ≥ 3 sessions dans les 7 derniers jours
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeekCount = sessions.filter(
      (s) => new Date(s.playedAt).getTime() > weekAgo
    ).length;
    if (thisWeekCount >= 3) {
      showNova('streak', tNova('dashboardStreak'), 4000);
      return () => hideNova();
    }

    return () => hideNova();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filtrage sessions par période ─────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
    );
    if (period === 'all') return sorted;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (period === '7j' ? 7 : 30));
    return sorted.filter((s) => new Date(s.playedAt) >= cutoff);
  }, [sessions, period]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalGames  = sessions.length;
  const totalPoints = sessions.reduce((acc, s) => acc + s.score, 0);
  const bestPct     = sessions.length
    ? Math.max(...sessions.map((s) => pct(s.score, s.totalQuestions)))
    : 0;

  // ── LineChart tendance ────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const scores = filteredSessions.map((s) => pct(s.score, s.totalQuestions));
    const trend  = linearRegression(scores);
    return filteredSessions.map((s, i) => ({
      name:  shortDate(s.playedAt),
      score: pct(s.score, s.totalQuestions),
      trend: trend[i],
      cat:   s.category,
    }));
  }, [filteredSessions]);

  // ── BarChart activité hebdomadaire ────────────────────────────────────────
  const weeklyData = useMemo(() => groupByWeek(sessions), [sessions]);


  // ── Évolution par catégorie ───────────────────────────────────────────────
  const catEvolution = useMemo(() => {
    const cats: Category[] = ['sciences', 'histoire', 'heroes'];
    return cats.map((cat) => {
      const catSessions = [...sessions]
        .filter((s) => s.category === cat)
        .sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime());

      if (catSessions.length < 2) {
        const avg = catSessions.length
          ? pct(catSessions[0].score, catSessions[0].totalQuestions)
          : null;
        return { cat, before: avg, after: avg, delta: 0, games: catSessions.length };
      }
      const half   = Math.max(1, Math.floor(catSessions.length / 2));
      const first  = catSessions.slice(0, half);
      const last   = catSessions.slice(-half);
      const before = Math.round(first.reduce((a, s) => a + pct(s.score, s.totalQuestions), 0) / first.length);
      const after  = Math.round(last.reduce((a, s) => a + pct(s.score, s.totalQuestions), 0) / last.length);
      return { cat, before, after, delta: after - before, games: catSessions.length };
    }).filter((c) => c.games > 0);
  }, [sessions]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="dashboard__header">
        <button
          type="button"
          className="dashboard__back-btn"
          onClick={() => router.push('/admin')}
          aria-label={t('ctaBack')}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <div className="dashboard__header-info">
          <h1 className="dashboard__title">{t('title')}</h1>
          {profile && (
            <p className="dashboard__subtitle">{profile.pseudo}</p>
          )}
        </div>
        {/* Filtre période dans le header — visible uniquement sur desktop (lg) */}
        <div className="dashboard__header-period" role="group" aria-label={t('periodLabel')}>
          {PERIODS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`dashboard__header-period-btn${period === id ? ' dashboard__header-period-btn--active' : ''}`}
              onClick={() => setPeriod(id)}
              aria-pressed={period === id}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="dashboard__header-spacer" aria-hidden="true" />
      </header>

      <main className="dashboard__body">

        {totalGames === 0 ? (
          <div className="dashboard__empty">
            <Gamepad2 size={56} className="dashboard__empty-icon" aria-hidden="true" />
            <p className="dashboard__empty-text">{t('noData')}</p>
          </div>
        ) : (
          <>
            {/* ── KPIs ─────────────────────────────────────────────────────── */}
            <section className="dashboard__kpis" aria-label="Indicateurs">
              <div className="dashboard__kpi">
                <Gamepad2 size={20} className="dashboard__kpi-icon" aria-hidden="true" />
                <span className="dashboard__kpi-value">{totalGames}</span>
                <span className="dashboard__kpi-label">{t('kpiGames')}</span>
              </div>
              <div className="dashboard__kpi">
                <Star size={20} className="dashboard__kpi-icon" aria-hidden="true" />
                <span className="dashboard__kpi-value">{totalPoints}</span>
                <span className="dashboard__kpi-label">{t('kpiPoints')}</span>
              </div>
              <div className="dashboard__kpi dashboard__kpi--highlight">
                <TrendingUp size={20} className="dashboard__kpi-icon" aria-hidden="true" />
                <span className="dashboard__kpi-value">{bestPct}%</span>
                <span className="dashboard__kpi-label">{t('kpiBest')}</span>
              </div>
              <div className="dashboard__kpi">
                <Flame size={20} className="dashboard__kpi-icon" aria-hidden="true" />
                <span className="dashboard__kpi-value">{dailyStreak}</span>
                <span className="dashboard__kpi-label">{t('kpiStreak')}</span>
              </div>
            </section>

            {/* ── Filtre période (mobile — sur desktop il est dans le header) ─ */}
            <div className="dashboard__period-filter" role="group" aria-label={t('periodLabel')}>
              {PERIODS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`dashboard__period-btn${period === id ? ' dashboard__period-btn--active' : ''}`}
                  onClick={() => setPeriod(id)}
                  aria-pressed={period === id}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Graphiques : grille 2 colonnes desktop ───────────────────── */}
            <div className="dashboard__charts-grid">

              {/* ── Tendance score ─────────────────────────────────────────── */}
              <section className="dashboard__section" aria-label={t('trendTitle')}>
                <h2 className="dashboard__section-title">
                  <TrendingUp size={16} aria-hidden="true" />
                  {t('trendTitle')}
                </h2>

                {trendData.length < 2 ? (
                  <p className="dashboard__section-empty">{t('notEnoughData')}</p>
                ) : (
                  <div className="dashboard__chart-wrap">
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            `${value ?? 0}%`,
                            name === 'score' ? t('scoreLabel') : t('trendLabel'),
                          ]}
                          contentStyle={{
                            fontFamily: 'Nunito, sans-serif',
                            fontSize: '13px',
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                          }}
                        />
                        <Legend
                          formatter={(value) =>
                            value === 'score' ? t('scoreLabel') : t('trendLabel')
                          }
                          wrapperStyle={{ fontSize: '12px', fontFamily: 'Nunito, sans-serif' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#667eea"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#667eea' }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="trend"
                          stroke="#FF9800"
                          strokeWidth={2}
                          strokeDasharray="5 4"
                          dot={false}
                          activeDot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              {/* ── Activité hebdomadaire ─────────────────────────────────── */}
              <section className="dashboard__section" aria-label={t('weeklyTitle')}>
                <h2 className="dashboard__section-title">
                  <BarChart3 size={16} aria-hidden="true" />
                  {t('weeklyTitle')}
                </h2>

                {weeklyData.length === 0 ? (
                  <p className="dashboard__section-empty">{t('notEnoughData')}</p>
                ) : (
                  <div className="dashboard__chart-wrap">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value) => [`${value} partie(s)`, t('weeklyLabel')]}
                          contentStyle={{
                            fontFamily: 'Nunito, sans-serif',
                            fontSize: '13px',
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                          }}
                        />
                        <Bar dataKey="count" fill="#667eea" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

            </div>{/* /charts-grid */}

            {/* ── Évolution par catégorie — pleine largeur ─────────────────── */}
            {catEvolution.length > 0 && (
              <section className="dashboard__section dashboard__section--full" aria-label={t('catEvolutionTitle')}>
                <h2 className="dashboard__section-title">
                  <TrendingUp size={16} aria-hidden="true" />
                  {t('catEvolutionTitle')}
                </h2>
                <p className="dashboard__section-desc">{t('catEvolutionDesc')}</p>

                <div className="dashboard__cat-evol-list">
                  {catEvolution.map(({ cat, before, after, delta, games }) => (
                    <div key={cat} className="dashboard__cat-evol-item">
                      <div className="dashboard__cat-evol-header">
                        <span
                          className="dashboard__cat-dot"
                          style={{ background: CAT_COLORS[cat] }}
                          aria-hidden="true"
                        />
                        <span className="dashboard__cat-name">{cat}</span>
                        <span className="dashboard__cat-games">{games} partie(s)</span>
                        {games >= 2 && (
                          <span
                            className={`dashboard__cat-delta${delta > 0 ? ' dashboard__cat-delta--up' : delta < 0 ? ' dashboard__cat-delta--down' : ''}`}
                          >
                            {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {Math.abs(delta)}%
                          </span>
                        )}
                      </div>

                      {games >= 2 && before !== null && after !== null && (
                        <div className="dashboard__cat-evol-bars">
                          <div className="dashboard__cat-evol-bar-row">
                            <span className="dashboard__cat-evol-bar-label">{t('catBefore')}</span>
                            <div className="dashboard__cat-evol-track">
                              <div
                                className="dashboard__cat-evol-fill dashboard__cat-evol-fill--before"
                                style={{ width: `${before}%` }}
                              />
                            </div>
                            <span className="dashboard__cat-evol-pct">{before}%</span>
                          </div>
                          <div className="dashboard__cat-evol-bar-row">
                            <span className="dashboard__cat-evol-bar-label">{t('catAfter')}</span>
                            <div className="dashboard__cat-evol-track">
                              <div
                                className="dashboard__cat-evol-fill"
                                style={{
                                  width: `${after}%`,
                                  background: CAT_COLORS[cat],
                                }}
                              />
                            </div>
                            <span className="dashboard__cat-evol-pct">{after}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}


        <button
          type="button"
          className="dashboard__cta-back"
          onClick={() => router.push('/admin')}
        >
          {t('ctaBack')}
        </button>

      </main>
    </div>
  );
}
