import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '../../services/api';
import type { Habit, HabitHistoryRow } from '../../types';
import { Card } from '../../components/primitives/Card/Card';
import { HabitHeatmap } from '../../components/HabitHeatmap/HabitHeatmap';
import { HABIT_COLORS } from '../../components/HabitHeatmap/colors';

type PeriodFilter = 'last3' | 'last6' | 'all';

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  last3: 'Últ. 3',
  last6: 'Últ. 6',
  all: 'Todo',
};

const shortMonth = (period: string) => {
  const [y, m] = period.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
};

export default function HabitsHistory() {
  const navigate = useNavigate();
  const [data, setData] = useState<HabitHistoryRow[]>([]);
  const [dailyHabits, setDailyHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('last6');

  useEffect(() => {
    Promise.all([
      api.getHabitHistory(),
      api.getHabitsRecent(370),
    ])
      .then(([history, daily]) => {
        setData(history);
        setDailyHabits(daily);
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const allMonths = useMemo(() =>
    [...new Set(data.map(r => r.period))].sort().filter(m => m <= currentPeriod),
    [data],
  );

  const filteredMonths = useMemo(() => {
    if (periodFilter === 'last3') return allMonths.slice(-3);
    if (periodFilter === 'last6') return allMonths.slice(-6);
    return allMonths;
  }, [allMonths, periodFilter]);

  const users = useMemo(() =>
    [...new Set(data.map(r => r.user))].sort(),
    [data],
  );

  // One chart per user — each chart has one Line per habit category
  // chartData[user]: [{ month, 'Habit A': 80, 'Habit B': 60, ... }]
  const chartsByUser = useMemo(() => {
    return users.map(user => {
      const userRows = data.filter(r => r.user === user && filteredMonths.includes(r.period));
      const habits = [...new Map(userRows.map(r => [r.categoryId, { id: r.categoryId, name: r.name, emoji: r.emoji }])).values()];

      const chartData = filteredMonths.map(month => {
        const entry: Record<string, string | number> = { month: shortMonth(month) };
        for (const h of habits) {
          const row = userRows.find(r => r.period === month && r.categoryId === h.id);
          entry[`${h.emoji} ${h.name}`] = row?.percentage ?? 0;
        }
        return entry;
      });

      return { user, habits, chartData };
    });
  }, [users, data, filteredMonths]);

  // Heatmap range: up to 12 most-recent filteredMonths
  const heatmapRange = useMemo(() => {
    const months = filteredMonths.slice(-12);
    if (months.length === 0) return null;
    const [sy, sm] = months[0].split('-').map(Number);
    const [ey, em] = months[months.length - 1].split('-').map(Number);
    return {
      startDate: new Date(sy, sm - 1, 1),
      endDate: new Date(ey, em, 0),
    };
  }, [filteredMonths]);

  const tooltipStyle = {
    backgroundColor: 'var(--bg)',
    color: 'var(--fg)',
    fontSize: '0.6rem',
    border: '1px solid var(--muted-fg)',
    padding: '4px 8px',
  };


  if (loading) {
    return (
      <div className="expense-list-page page-bg">
        <div className="expense-list-container content-panel">
          <div className="expense-list-empty"><span className="helper-text">Cargando...</span></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="expense-list-page page-bg">
        <div className="expense-list-container content-panel">
          <div className="expense-list-empty">
            <span className="helper-text" style={{ color: 'var(--destructive)' }}>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-list-page page-bg">
      <div className="expense-list-container content-panel">

        <header className="expense-list-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => navigate('/habits')}
                className="btn"
                style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}
              >
                ←
              </button>
              <h2 className="expense-list-title">Historial hábitos</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {(['last3', 'last6', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPeriodFilter(f)}
                  className="btn"
                  style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', opacity: periodFilter === f ? 1 : 0.4 }}
                >
                  {PERIOD_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="expense-list">
          {chartsByUser.map(({ user, habits, chartData }) => (
            <Card key={user} as="section">
              <div className="summary-card-inner">
                <h3 className="card-title summary-section-title" style={{ marginBottom: '0.75rem', textTransform: 'capitalize' }}>
                  {user}
                </h3>
                <div style={{ height: 220, overflow: 'visible' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-fg)" opacity={0.3} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--fg)' }} />
                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: 'var(--fg)' }} width={36} />
                        <Tooltip
                          formatter={(v: number | undefined) => `${v ?? 0}%`}
                          contentStyle={tooltipStyle}
                        />
                        <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                        {habits.map((h, i) => (
                          <Line
                            key={h.id}
                            type="monotone"
                            dataKey={`${h.emoji} ${h.name}`}
                            stroke={HABIT_COLORS[i % HABIT_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Daily heatmap */}
                {heatmapRange && (
                  <div style={{ borderTop: '1px solid var(--muted-fg)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                    <HabitHeatmap
                      habits={dailyHabits.filter(h => h.user === user)}
                      categories={habits.map(h => ({ id: h.id, name: h.name, emoji: h.emoji, defaultValue: false }))}
                      startDate={heatmapRange.startDate}
                      endDate={heatmapRange.endDate}
                    />
                  </div>
                )}

                {/* Summary table — periods as rows, habit emojis as columns */}
                <div style={{ borderTop: '1px solid var(--muted-fg)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.2rem 0.4rem', color: 'var(--muted-fg)', fontWeight: 500 }}></th>
                        {habits.map((h, i) => (
                          <th key={h.id} style={{ textAlign: 'center', padding: '0.2rem 0.4rem', color: HABIT_COLORS[i % HABIT_COLORS.length], fontWeight: 500, fontSize: '1rem' }}>
                            {h.emoji}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMonths.map(m => (
                        <tr key={m}>
                          <td style={{ padding: '0.2rem 0.4rem', color: 'var(--muted-fg)', whiteSpace: 'nowrap' }}>{shortMonth(m)}</td>
                          {habits.map((h) => {
                            const row = data.find(r => r.period === m && r.categoryId === h.id && r.user === user);
                            const v = row?.percentage ?? null;
                            return (
                              <td key={h.id} style={{ textAlign: 'center', padding: '0.2rem 0.4rem', color: 'var(--fg)' }}>
                                {v !== null ? `${v}%` : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr style={{ borderTop: '1px solid var(--muted-fg)' }}>
                        <td style={{ padding: '0.2rem 0.4rem', color: 'var(--muted-fg)', fontWeight: 600, whiteSpace: 'nowrap' }}>Prom.</td>
                        {habits.map((h, i) => {
                          const validValues = filteredMonths
                            .map(m => data.find(r => r.period === m && r.categoryId === h.id && r.user === user)?.percentage ?? null)
                            .filter((v): v is number => v !== null);
                          const avg = validValues.length > 0 ? Math.round(validValues.reduce((s, v) => s + v, 0) / validValues.length) : 0;
                          return (
                            <td key={h.id} style={{ textAlign: 'center', padding: '0.2rem 0.4rem', fontWeight: 600, color: HABIT_COLORS[i % HABIT_COLORS.length] }}>
                              {avg}%
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
