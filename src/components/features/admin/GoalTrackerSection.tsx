'use client';

/**
 * src/components/features/admin/GoalTrackerSection.tsx
 *
 * Section "Suivi des objectifs" du DashboardScreen.
 * Affiche un mini LineChart par catégorie (8 semaines) avec la ligne cible en pointillé.
 * Utilisé uniquement dans DashboardScreen.
 */

import { useTranslations } from 'next-intl';
import { Target } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const CAT_COLORS: Record<string, string> = {
  sciences:   '#2196F3',
  histoire:   '#795548',
  heroes:     '#E91E63',
  math:       '#FF9800',
  sport:      '#4CAF50',
  geographie: '#00BCD4',
  francais:   '#795548',
};

interface WeekPoint {
  week:  string;
  avg:   number;
  count: number;
}

interface GoalStatus {
  category:   string;
  target:     number;
  weekAvg:    number | null;
  overallAvg: number | null;
  trend:      WeekPoint[];
}

interface Props {
  goalStatuses: GoalStatus[];
}

export default function GoalTrackerSection({ goalStatuses }: Props) {
  const t = useTranslations('dashboard');

  if (goalStatuses.length === 0) return null;

  return (
    <section className="dashboard__section" aria-label={t('goalsTitle')}>
      <h2 className="dashboard__section-title">
        <Target size={16} aria-hidden="true" />
        {t('goalsTitle')}
      </h2>

      <div className="dashboard__goals-list">
        {goalStatuses.map(({ category, target, weekAvg, overallAvg, trend }) => {
          const weekRounded    = weekAvg    !== null ? Math.round(weekAvg)    : null;
          const overallRounded = overallAvg !== null ? Math.round(overallAvg) : null;
          const met            = weekRounded !== null && weekRounded >= target;

          const trendChartData = trend.map((w) => ({
            name: w.week.replace(/^\d{4}-/, ''),
            avg:  w.count > 0 ? Math.round(w.avg) : null,
          }));

          return (
            <div key={category} className="dashboard__goals-card">
              <div className="dashboard__goals-card-header">
                <span
                  className="dashboard__goals-dot"
                  style={{ background: CAT_COLORS[category] }}
                  aria-hidden="true"
                />
                <span className="dashboard__goals-name">{category}</span>
                <span className={`dashboard__goals-badge${met ? ' dashboard__goals-badge--met' : ''}`}>
                  {t('goalsTarget')} : {target}%
                </span>
              </div>

              {/* KPIs : cette semaine + moyenne globale */}
              <div className="dashboard__goals-kpis">
                <div className="dashboard__goals-kpi">
                  <span className="dashboard__goals-kpi-label">{t('goalsWeekAvg')}</span>
                  <span className={`dashboard__goals-kpi-value${met ? ' dashboard__goals-kpi-value--met' : ''}`}>
                    {weekRounded !== null ? `${weekRounded}%` : t('goalsNoData')}
                  </span>
                </div>
                <div className="dashboard__goals-kpi">
                  <span className="dashboard__goals-kpi-label">{t('goalsOverall')}</span>
                  <span className="dashboard__goals-kpi-value">
                    {overallRounded !== null ? `${overallRounded}%` : '—'}
                  </span>
                </div>
              </div>

              {/* Mini LineChart 8 semaines + ligne cible */}
              <div className="dashboard__chart-wrap">
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={trendChartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fontFamily: 'Nunito, sans-serif', fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 10, fontFamily: 'Nunito, sans-serif', fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickCount={3}
                    />
                    <Tooltip
                      formatter={(value) => [`${value ?? 0}%`, t('goalsWeekAvg')]}
                      contentStyle={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      }}
                    />
                    {/* Ligne cible — pointillé orange */}
                    <ReferenceLine
                      y={target}
                      stroke="#FF9800"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                    />
                    {/* Courbe moyenne hebdomadaire */}
                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke={CAT_COLORS[category]}
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: CAT_COLORS[category] }}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
