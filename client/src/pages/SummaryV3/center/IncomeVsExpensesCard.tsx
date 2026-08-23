import { useMemo } from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, ReferenceLine,
} from 'recharts';
import type { CategoryHistoryRow } from '../../../types';
import { useCategoryFilter } from '../../../hooks/useCategoryFilter';
import { FilterLegend } from '../../../feature/Charts/FilterLegend';
import type { LegendItem } from '../../../feature/Charts/FilterLegend';
import { Card } from '../../../components/primitives/Card/Card';
import { shortMonth, fmtAmt } from '../utils/dates';
import { USER_COLORS, TREND_COLOR } from '../utils/colors';
import type { UserFilter } from '../state';
import { useBudgetConfig } from '../../../context/BudgetConfigContext';

interface Props {
  filteredMonths: string[];
  filteredData: CategoryHistoryRow[];
  user: UserFilter;
  onSelectMonth: (period: string) => void;
}

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--bg)',
  color: 'var(--fg)',
  fontSize: '0.75rem',
  border: '1px solid var(--muted-fg)',
};

export function IncomeVsExpensesCard({ filteredMonths, filteredData, user, onSelectMonth }: Props) {
  const { labelForSlot } = useBudgetConfig();
  const allUsers = useMemo(() =>
    [...new Set(filteredData.map(r => r.user))].sort(),
    [filteredData],
  );

  const bars = useMemo(() => {
    if (user === 'all') {
      return [
        { key: 'Ingresos', stackId: 'income', fill: '#4bacc6' },
        { key: 'Gastos', stackId: 'expense', fill: '#c0504d' },
      ];
    }
    if (user === 'household') {
      return [
        { key: 'Ingresos compartidos', stackId: 'income', fill: '#4bacc6' },
        { key: 'Gastos compartidos', stackId: 'expense', fill: '#c0504d' },
      ];
    }
    const label = labelForSlot(user);
    const colors = USER_COLORS[user] ?? { income: '#8064a2', expense: '#d99694' };
    return [
      { key: `${label} ingresos`, stackId: 'income', fill: colors.income },
      { key: `${label} gastos`, stackId: 'expense', fill: colors.expense },
    ];
  }, [user, labelForSlot]);

  const barKeys = useMemo(() => bars.map(b => b.key), [bars]);
  const { hidden, toggle, isolate } = useCategoryFilter(barKeys);

  const chartData = useMemo(() =>
    filteredMonths.map(period => {
      const row: Record<string, string | number> = { month: shortMonth(period), _period: period };
      const monthRows = filteredData.filter(r => r.period === period);

      if (user === 'all') {
        const inc = allUsers.reduce((s, u) =>
          s + monthRows.filter(r => r.user === u && r.type === 'income').reduce((a, r) => a + r.total, 0), 0);
        const exp = allUsers.reduce((s, u) =>
          s + monthRows.filter(r => r.user === u && r.type === 'expense').reduce((a, r) => a + r.total, 0), 0);
        row['Ingresos'] = inc;
        row['Gastos'] = exp;
        row['_net'] = inc - exp;
      } else if (user === 'household') {
        const inc = monthRows.filter(r => r.type === 'income' && r.shared > 0).reduce((s, r) => s + r.shared, 0);
        const exp = monthRows.filter(r => r.type === 'expense' && r.shared > 0).reduce((s, r) => s + r.shared, 0);
        row['Ingresos compartidos'] = inc;
        row['Gastos compartidos'] = exp;
        row['_net'] = inc - exp;
      } else {
        const label = labelForSlot(user);
        const inc = monthRows.filter(r => r.user === user && r.type === 'income').reduce((s, r) => s + r.total, 0);
        const exp = monthRows.filter(r => r.user === user && r.type === 'expense').reduce((s, r) => s + r.total, 0);
        row[`${label} ingresos`] = inc;
        row[`${label} gastos`] = exp;
        row['_net'] = inc - exp;
      }
      return row;
    }),
    [filteredMonths, filteredData, allUsers, user, labelForSlot],
  );

  const legendItems: LegendItem[] = [
    ...bars.map(b => ({ key: b.key, color: b.fill })),
    { key: '_net', color: TREND_COLOR, label: 'Ahorro neto', noFilter: true, isDash: true },
  ];

  return (
    <Card as="section">
      <div className="summary-card-inner">
        <h3 className="card-title summary-section-title" style={{ marginBottom: '0.4rem' }}>
          2 · Ingresos vs Gastos
        </h3>

        <div style={{ height: 180, paddingTop: 4, paddingBottom: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} maxBarSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-fg)" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--fg)' }} />
              <YAxis
                tickFormatter={v => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`}
                tick={{ fontSize: 10, fill: 'var(--fg)' }}
                width={44}
              />
              <Tooltip
                formatter={(v: number | undefined, name: string | undefined) =>
                  [`$${fmtAmt(v ?? 0)}`, name === '_net' ? 'Ahorro neto' : (name ?? '')]
                }
                contentStyle={TOOLTIP_STYLE}
                allowEscapeViewBox={{ x: false, y: true }}
                wrapperStyle={{ zIndex: 200 }}
              />
              <ReferenceLine y={0} stroke="var(--muted-fg)" strokeOpacity={0.5} />
              {bars.filter(b => !hidden.has(b.key)).map(({ key, stackId, fill }) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId={stackId}
                  fill={fill}
                  onClick={(data: any) => onSelectMonth(data._period)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
              <Line
                type="natural"
                dataKey="_net"
                stroke={TREND_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: TREND_COLOR }}
                strokeDasharray="4 2"
                name="Ahorro neto"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <FilterLegend
          items={legendItems}
          hidden={hidden}
          onToggle={toggle}
          onIsolate={isolate}
        />
      </div>
    </Card>
  );
}
