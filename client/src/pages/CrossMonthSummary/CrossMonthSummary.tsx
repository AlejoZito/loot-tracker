import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line,
} from 'recharts';
import { api } from '../../services/api';
import type { CategoryHistoryRow } from '../../types';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { FilterLegend } from '../../feature/Charts/FilterLegend';
import type { LegendItem } from '../../feature/Charts/FilterLegend';
import { Card } from '../../components/primitives/Card/Card';
import { useBudgetConfig } from '../../context/BudgetConfigContext';

interface Props {
  budgetUser: string | null;
}

const COLORS = [
  '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6',
  '#f79646', '#7f6084', '#2c4d75', '#77933c', '#d99694',
  '#b5a1c5', '#92cddc',
];

const USER_COLORS: Record<'userA' | 'userB', { income: string; expense: string }> = {
  userA: { income: '#1565c0', expense: '#42a5f5' },
  userB: { income: '#2e7d32', expense: '#66bb6a' },
};

type PeriodFilter = 'last6' | 'ytd' | 'all';
type ExpenseMode = 'user' | 'hogar';

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  last6: 'Últ. 6',
  ytd: 'Este año',
  all: 'Todo',
};

export default function CrossMonthSummary({ budgetUser }: Props) {
  const { config, labelForUser, slotForUser } = useBudgetConfig();
  const [data, setData] = useState<CategoryHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('last6');
  const [expenseMode, setExpenseMode] = useState<ExpenseMode>('user');
  const [chart2User, setChart2User] = useState<string>('all');

  const user = budgetUser || config.users[0]?.id || '';
  const userLabel = labelForUser(user);

  useEffect(() => {
    api.getCategoryHistory()
      .then(setData)
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');
  const shortMonth = (period: string) => {
    const [y, m] = period.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
  };

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  const allMonths = useMemo(() =>
    [...new Set(data.map(r => r.period))].sort().filter(m => m <= currentPeriod),
    [data],
  );

  const filteredMonths = useMemo(() => {
    if (periodFilter === 'last6') return allMonths.slice(-6);
    if (periodFilter === 'ytd') return allMonths.filter(m => m.startsWith(`${now.getFullYear()}-`));
    return allMonths;
  }, [allMonths, periodFilter]);

  const filteredData = useMemo(() =>
    data.filter(r => filteredMonths.includes(r.period)),
    [data, filteredMonths],
  );

  const allUsers = useMemo(() =>
    [...new Set(data.map(r => r.user))].sort(),
    [data],
  );

  const visibleCategories = useMemo(() => {
    const cats = new Set<string>();
    if (expenseMode === 'user') {
      filteredData.filter(r => r.type === 'expense' && r.user === user).forEach(r => cats.add(r.category));
    } else {
      filteredData.filter(r => r.type === 'expense' && r.shared > 0).forEach(r => cats.add(r.category));
    }
    return [...cats].sort();
  }, [filteredData, expenseMode, user]);

  // ── Chart 1 filtering ──
  const { hidden: hidden1, toggle: toggle1, isolate: isolate1, reset: reset1 } = useCategoryFilter(visibleCategories);

  useEffect(() => { reset1(); }, [expenseMode, user, periodFilter]);

  // ── Chart 2 bars ──
  const chart2Bars = useMemo(() => {
    if (chart2User === 'all') {
      return [
        { key: 'Ingresos', stackId: 'income', fill: '#4bacc6' },
        { key: 'Gastos', stackId: 'expense', fill: '#c0504d' },
      ];
    }
    const u = chart2User;
    const label = labelForUser(u);
    const colors = USER_COLORS[slotForUser(u)] ?? { income: '#8064a2', expense: '#d99694' };
    return [
      { key: `${label} ingresos`, stackId: 'income', fill: colors.income },
      { key: `${label} gastos`, stackId: 'expense', fill: colors.expense },
    ];
  }, [chart2User, labelForUser, slotForUser]);

  const chart2BarKeys = useMemo(() => chart2Bars.map(b => b.key), [chart2Bars]);

  // ── Chart 2 filtering ──
  const { hidden: hidden2, toggle: toggle2, isolate: isolate2, reset: reset2 } = useCategoryFilter(chart2BarKeys);

  useEffect(() => { reset2(); }, [chart2User]);

  // ── Chart data ──
  const chart1Data = useMemo(() =>
    filteredMonths.map(month => {
      const row: Record<string, string | number> = { month: shortMonth(month) };
      const monthRows = filteredData.filter(r => r.period === month && r.type === 'expense');
      let total = 0;
      if (expenseMode === 'user') {
        monthRows.filter(r => r.user === user).forEach(r => {
          const v = r.personal + r.shared;
          total += v;
          if (!hidden1.has(r.category))
            row[r.category] = ((row[r.category] as number) || 0) + v;
        });
      } else {
        monthRows.filter(r => r.shared > 0).forEach(r => {
          total += r.shared;
          if (!hidden1.has(r.category))
            row[r.category] = ((row[r.category] as number) || 0) + r.shared;
        });
      }
      row['_total'] = total;
      return row;
    }),
    [filteredMonths, filteredData, expenseMode, user, hidden1],
  );

  const chart2Data = useMemo(() =>
    filteredMonths.map(month => {
      const row: Record<string, string | number> = { month: shortMonth(month) };
      const monthRows = filteredData.filter(r => r.period === month);
      const usersToShow = chart2User === 'all' ? allUsers : [chart2User];
      if (chart2User === 'all') {
        const inc = usersToShow.reduce((s, u) =>
          s + monthRows.filter(r => r.user === u && r.type === 'income').reduce((a, r) => a + r.total, 0), 0);
        const exp = usersToShow.reduce((s, u) =>
          s + monthRows.filter(r => r.user === u && r.type === 'expense').reduce((a, r) => a + r.total, 0), 0);
        row['Ingresos'] = inc;
        row['Gastos'] = exp;
        row['_net'] = inc - exp;
      } else {
        const u = chart2User;
        const label = labelForUser(u);
        const inc = monthRows.filter(r => r.user === u && r.type === 'income').reduce((s, r) => s + r.total, 0);
        const exp = monthRows.filter(r => r.user === u && r.type === 'expense').reduce((s, r) => s + r.total, 0);
        row[`${label} ingresos`] = inc;
        row[`${label} gastos`] = exp;
        row['_net'] = inc - exp;
      }
      return row;
    }),
    [filteredMonths, filteredData, allUsers, chart2User, labelForUser],
  );

  // ── Legend items ──
  const chart1LegendItems: LegendItem[] = visibleCategories.map((cat, i) => ({
    key: cat,
    color: COLORS[i % COLORS.length],
  }));

  const chart2LegendItems: LegendItem[] = [
    ...chart2Bars.map(b => ({ key: b.key, color: b.fill })),
    { key: '_net', color: '#f5a623', label: 'Ahorro neto', noFilter: true, isDash: true },
  ];

  // ── Section B analysis ──
  const sectionBMonths = useMemo(() =>
    filteredMonths.map(month => {
      const monthRows = filteredData.filter(r => r.period === month && r.type === 'expense');
      const amounts: Record<string, number> = {};
      if (expenseMode === 'user') {
        monthRows.filter(r => r.user === user).forEach(r => {
          amounts[r.category] = (amounts[r.category] || 0) + r.personal + r.shared;
        });
      } else {
        monthRows.filter(r => r.shared > 0).forEach(r => {
          amounts[r.category] = (amounts[r.category] || 0) + r.shared;
        });
      }
      return { month, amounts, total: Object.values(amounts).reduce((s, v) => s + v, 0) };
    }),
    [filteredMonths, filteredData, expenseMode, user],
  );

  const numMonths = filteredMonths.length || 1;
  const avgTotal = sectionBMonths.reduce((s, r) => s + r.total, 0) / numMonths;

  const categoryStats = useMemo(() =>
    visibleCategories
      .map(cat => ({
        cat,
        avg: sectionBMonths.reduce((s, r) => s + (r.amounts[cat] || 0), 0) / numMonths,
        total: sectionBMonths.reduce((s, r) => s + (r.amounts[cat] || 0), 0),
      }))
      .filter(x => x.avg > 0)
      .sort((a, b) => b.avg - a.avg),
    [visibleCategories, sectionBMonths, numMonths],
  );

  const tooltipStyle = {
    backgroundColor: 'var(--bg)',
    color: 'var(--fg)',
    fontSize: '0.75rem',
    border: '1px solid var(--muted-fg)',
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
            <h2 className="expense-list-title">Evolución</h2>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {(['last6', 'ytd', 'all'] as const).map(f => (
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

          {/* Chart 1: Expenses by category */}
          <Card as="section">
            <div className="summary-card-inner">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <h3 className="card-title summary-section-title">Gastos por categoría</h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {(['user', 'hogar'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setExpenseMode(mode)}
                      className="btn"
                      style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', opacity: expenseMode === mode ? 1 : 0.4 }}
                    >
                      {mode === 'user' ? userLabel : 'Hogar'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chart1Data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} maxBarSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-fg)" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--fg)' }} />
                    <YAxis tickFormatter={v => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`} tick={{ fontSize: 10, fill: 'var(--fg)' }} width={48} />
                    <Tooltip
                      formatter={(v: number | undefined, name: string | undefined) =>
                        [`$${fmt(v ?? 0)}`, name === '_total' ? 'Total gastos' : (name ?? '')]
                      }
                      contentStyle={tooltipStyle}
                      allowEscapeViewBox={{ x: false, y: true }}
                      wrapperStyle={{ zIndex: 200 }}
                    />
                    {visibleCategories.filter(c => !hidden1.has(c)).map(cat => (
                      <Bar
                        key={cat}
                        dataKey={cat}
                        stackId="a"
                        fill={COLORS[visibleCategories.indexOf(cat) % COLORS.length]}
                      />
                    ))}
                    {hidden1.size === 0 && (
                      <Line
                        type="natural"
                        dataKey="_total"
                        stroke="#f5a623"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#f5a623' }}
                        strokeDasharray="4 2"
                        name="Total gastos"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <FilterLegend
                items={chart1LegendItems}
                hidden={hidden1}
                onToggle={toggle1}
                onIsolate={isolate1}
              />
            </div>
          </Card>

          {/* Chart 2: Income vs expenses */}
          <Card as="section">
            <div className="summary-card-inner">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <h3 className="card-title summary-section-title">Ingresos vs gastos</h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {(['all', ...allUsers]).map(u => (
                    <button
                      key={u}
                      onClick={() => setChart2User(u)}
                      className="btn"
                      style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', opacity: chart2User === u ? 1 : 0.4 }}
                    >
                      {u === 'all' ? 'Todos' : labelForUser(u)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chart2Data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} maxBarSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-fg)" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--fg)' }} />
                    <YAxis tickFormatter={v => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`} tick={{ fontSize: 10, fill: 'var(--fg)' }} width={48} />
                    <Tooltip
                      formatter={(v: number | undefined, name: string | undefined) =>
                        [`$${fmt(v ?? 0)}`, name === '_net' ? 'Ahorro neto' : (name ?? '')]
                      }
                      contentStyle={tooltipStyle}
                      allowEscapeViewBox={{ x: false, y: true }}
                      wrapperStyle={{ zIndex: 200 }}
                    />
                    {chart2Bars
                      .filter(b => !hidden2.has(b.key))
                      .map(({ key, stackId, fill }) => (
                        <Bar key={key} dataKey={key} stackId={stackId} fill={fill} />
                      ))}
                    <Line
                      type="natural"
                      dataKey="_net"
                      stroke="#f5a623"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#f5a623' }}
                      strokeDasharray="4 2"
                      name="Ahorro neto"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <FilterLegend
                items={chart2LegendItems}
                hidden={hidden2}
                onToggle={toggle2}
                onIsolate={isolate2}
              />
            </div>
          </Card>

          {/* Section B: Analysis */}
          {sectionBMonths.length > 0 && (
            <Card as="section">
              <div className="summary-card-inner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 className="card-title summary-section-title">Análisis</h3>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>
                    {expenseMode === 'user' ? userLabel : 'Hogar'} · {filteredMonths.length} mes{filteredMonths.length !== 1 ? 'es' : ''}
                  </span>
                </div>

                <div className="summary-subtotals" style={{ marginBottom: '0.75rem' }}>
                  <div className="summary-row summary-row-total" style={{ marginBottom: '0.4rem' }}>
                    <span className="card-title">Promedio mensual</span>
                    <span className="card-title">${fmt(avgTotal)}</span>
                  </div>
                  {categoryStats.map(({ cat, avg }) => (
                    <div key={cat} className="summary-row">
                      <span className="card-text summary-row-label">{cat}</span>
                      <span className="card-meta summary-row-value">${fmt(avg)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--muted-fg)', paddingTop: '0.6rem', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.2rem 0.4rem', color: 'var(--muted-fg)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          Categoría
                        </th>
                        {sectionBMonths.map(({ month }) => (
                          <th key={month} style={{ textAlign: 'right', padding: '0.2rem 0.4rem', color: 'var(--muted-fg)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {shortMonth(month)}
                          </th>
                        ))}
                        <th style={{ textAlign: 'right', padding: '0.2rem 0.4rem', color: 'var(--muted-fg)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryStats.map(({ cat, total }) => (
                        <tr key={cat}>
                          <td style={{ padding: '0.2rem 0.4rem', color: 'var(--fg)', whiteSpace: 'nowrap' }}>{cat}</td>
                          {sectionBMonths.map(({ month, amounts }) => (
                            <td key={month} style={{ textAlign: 'right', padding: '0.2rem 0.4rem', color: 'var(--fg)' }}>
                              {amounts[cat] ? `$${fmt(amounts[cat])}` : '-'}
                            </td>
                          ))}
                          <td style={{ textAlign: 'right', padding: '0.2rem 0.4rem', fontWeight: 600, color: 'var(--fg)' }}>
                            ${fmt(total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '1px solid var(--muted-fg)' }}>
                        <td style={{ padding: '0.3rem 0.4rem', fontWeight: 600, color: 'var(--fg)' }}>Total</td>
                        {sectionBMonths.map(({ month, total }) => (
                          <td key={month} style={{ textAlign: 'right', padding: '0.3rem 0.4rem', fontWeight: 600, color: 'var(--fg)' }}>
                            ${fmt(total)}
                          </td>
                        ))}
                        <td style={{ textAlign: 'right', padding: '0.3rem 0.4rem', fontWeight: 600, color: 'var(--fg)' }}>
                          ${fmt(sectionBMonths.reduce((s, r) => s + r.total, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
