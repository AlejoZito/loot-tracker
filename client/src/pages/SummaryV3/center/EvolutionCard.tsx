import { useMemo } from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line,
} from 'recharts';
import type { CategoryHistoryRow } from '../../../types';
import { useCategoryFilter } from '../../../hooks/useCategoryFilter';
import { FilterLegend } from '../../../feature/Charts/FilterLegend';
import type { LegendItem } from '../../../feature/Charts/FilterLegend';
import { Card } from '../../../components/primitives/Card/Card';
import { shortMonth, fmtAmt } from '../utils/dates';
import { CATEGORY_COLORS, TREND_COLOR } from '../utils/colors';
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

export function EvolutionCard({ filteredMonths, filteredData, user, onSelectMonth }: Props) {
  const { labelForSlot } = useBudgetConfig();
  const visibleCategories = useMemo(() => {
    const cats = new Set<string>();
    if (user === 'household') {
      filteredData.filter(r => r.type === 'expense' && r.shared > 0).forEach(r => cats.add(r.category));
    } else if (user === 'all') {
      filteredData.filter(r => r.type === 'expense').forEach(r => cats.add(r.category));
    } else {
      filteredData.filter(r => r.type === 'expense' && r.user === user).forEach(r => cats.add(r.category));
    }
    return [...cats].sort();
  }, [filteredData, user]);

  const { hidden, toggle, isolate } = useCategoryFilter(visibleCategories);

  const chartData = useMemo(() =>
    filteredMonths.map(period => {
      const row: Record<string, string | number> = { month: shortMonth(period), _period: period };
      const monthRows = filteredData.filter(r => r.period === period && r.type === 'expense');
      let total = 0;
      if (user === 'household') {
        monthRows.filter(r => r.shared > 0).forEach(r => {
          total += r.shared;
          if (!hidden.has(r.category))
            row[r.category] = ((row[r.category] as number) || 0) + r.shared;
        });
      } else if (user === 'all') {
        monthRows.forEach(r => {
          const v = r.personal + r.shared;
          total += v;
          if (!hidden.has(r.category))
            row[r.category] = ((row[r.category] as number) || 0) + v;
        });
      } else {
        monthRows.filter(r => r.user === user).forEach(r => {
          const v = r.personal + r.shared;
          total += v;
          if (!hidden.has(r.category))
            row[r.category] = ((row[r.category] as number) || 0) + v;
        });
      }
      row['_total'] = total;
      return row;
    }),
    [filteredMonths, filteredData, user, hidden],
  );

  const legendItems: LegendItem[] = visibleCategories.map((cat, i) => ({
    key: cat,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return (
    <Card as="section">
      <div className="summary-card-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <h3 className="card-title summary-section-title">1 · Gastos por categoría</h3>
          <span style={{ fontSize: '0.62rem', color: 'var(--muted-fg)' }}>
            {user === 'all' ? 'Todos' : user === 'household' ? 'Hogar' : labelForSlot(user)}
          </span>
        </div>

        <div style={{ height: 180, paddingTop: 4, paddingBottom: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} maxBarSize={34}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-fg)" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--fg)' }} />
              <YAxis
                tickFormatter={v => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`}
                tick={{ fontSize: 10, fill: 'var(--fg)' }}
                width={44}
              />
              <Tooltip
                formatter={(v: number | undefined, name: string | undefined) =>
                  [`$${fmtAmt(v ?? 0)}`, name === '_total' ? 'Total' : (name ?? '')]
                }
                contentStyle={TOOLTIP_STYLE}
                allowEscapeViewBox={{ x: false, y: true }}
                wrapperStyle={{ zIndex: 200 }}
              />
              {visibleCategories.filter(c => !hidden.has(c)).map((cat) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId="a"
                  fill={CATEGORY_COLORS[visibleCategories.indexOf(cat) % CATEGORY_COLORS.length]}
                  onClick={(data: any) => onSelectMonth(data._period)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
              {hidden.size === 0 && (
                <Line
                  type="natural"
                  dataKey="_total"
                  stroke={TREND_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: TREND_COLOR }}
                  strokeDasharray="4 2"
                  name="Total"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <FilterLegend
          items={legendItems}
          hidden={hidden}
          onToggle={toggle}
          onIsolate={(cat: string) => isolate(cat)}
        />

        <p style={{ fontSize: '0.6rem', color: 'var(--muted-fg)', marginTop: '0.3rem' }}>
          click en barra → selecciona mes · click en leyenda → aislar categoría
        </p>
      </div>
    </Card>
  );
}
