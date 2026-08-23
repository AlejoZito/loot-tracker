import { Fragment, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../../../../components/primitives/Card/Card';
import { FilterLegend } from '../../../../feature/Charts/FilterLegend';
import { useCategoryFilter } from '../../../../hooks/useCategoryFilter';
import { PayerBadge } from '../../../ExpenseList/components/PayerBadge';
import { slotForUser } from '../../../ExpenseList/utils';
import { useBudgetConfig } from '../../../../context/BudgetConfigContext';
import type { IncomeCategoryBreakdown, InstallmentExpense } from '../../../../types';
import type { UserFilter } from '../../state';
import { fmtAmt } from '../../utils/dates';
import { CATEGORY_COLORS } from '../../utils/colors';

interface Props {
  expenses: IncomeCategoryBreakdown[];
  installments: InstallmentExpense[];
  user: UserFilter;
}

type AggCat = { category: string; personal: number; shared: number; total: number };

function aggregateExpenses(expenses: IncomeCategoryBreakdown[], user: UserFilter): AggCat[] {
  const map = new Map<string, { personal: number; shared: number }>();
  expenses.forEach(c => {
    if (user === 'all') {
      const p = map.get(c.category) ?? { personal: 0, shared: 0 };
      map.set(c.category, { personal: p.personal + c.personal, shared: p.shared + c.shared });
    } else if (user === 'household') {
      if (c.shared > 0) {
        const p = map.get(c.category) ?? { personal: 0, shared: 0 };
        map.set(c.category, { personal: 0, shared: p.shared + c.shared });
      }
    } else {
      if (c.user === user) {
        const p = map.get(c.category) ?? { personal: 0, shared: 0 };
        map.set(c.category, { personal: p.personal + c.personal, shared: p.shared + c.shared });
      }
    }
  });
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, ...v, total: v.personal + v.shared }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

function filterInstallments(items: InstallmentExpense[], user: UserFilter): InstallmentExpense[] {
  if (user === 'household') return items.filter(i => i.shared);
  if (user === 'all') return items;
  return items.filter(i => i.user === user);
}

function fmtDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--bg)',
  color: 'var(--fg)',
  fontSize: '0.72rem',
};

export function GastosPorCategoriaTable({ expenses, installments, user }: Props) {
  const { config } = useBudgetConfig();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const categories = useMemo(() => aggregateExpenses(expenses, user), [expenses, user]);

  const showHogar = user === 'household';

  const installmentsByCategory = useMemo(() => {
    const map: Record<string, InstallmentExpense[]> = {};
    for (const item of installments) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [installments]);

  // Pie chart data
  const pieData = useMemo(() =>
    categories
      .map((c, i) => ({ category: c.category, total: c.total, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
    [categories],
  );

  const { hidden, toggle, isolate } = useCategoryFilter(
    useMemo(() => pieData.map(d => d.category), [pieData]),
  );
  const visiblePie = pieData.filter(d => !hidden.has(d.category));
  const pieTotal = pieData.reduce((s, d) => s + d.total, 0);

  const totalPersonal = categories.reduce((s, c) => s + c.personal, 0);
  const totalShared = categories.reduce((s, c) => s + c.shared, 0);
  const grandTotal = totalPersonal + totalShared;

  return (
    <Card as="section">
      <div className="summary-card-inner">
        <h3 className="card-title summary-section-title">Gastos por categoría</h3>

        {pieData.length > 0 && (
          <>
            <div style={{ width: '100%', height: 130, marginTop: '0.25rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={visiblePie} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={52}>
                    {visiblePie.map(d => <Cell key={d.category} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number | undefined, name: string | undefined) =>
                      [`$${fmtAmt(v ?? 0)} (${pieTotal > 0 ? Math.round((v ?? 0) / pieTotal * 100) : 0}%)`, name ?? '']
                    }
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <FilterLegend
              items={pieData.map(d => ({
                key: d.category,
                color: d.color,
                meta: `$${fmtAmt(d.total)}`,
              }))}
              hidden={hidden}
              onToggle={toggle}
              onIsolate={isolate}
            />
          </>
        )}

        {categories.length > 0 ? (
          <div className="summary-category-list" style={{ marginTop: '0.5rem' }}>
            {/* Header row */}
            <div className={`detalle-cat-row${showHogar ? ' detalle-cat-row--hogar' : ''}`}>
              <span className="detalle-cat-row__head" />
              {!showHogar && (
                <span className="detalle-cat-row__head detalle-cat-row__num">Personal</span>
              )}
              <span className="detalle-cat-row__head detalle-cat-row__num">
                {showHogar ? 'Total' : 'Compartido'}
              </span>
            </div>

            {categories.map(cat => {
              const isExpanded = expandedCategory === cat.category;
              const rawInstallments = installmentsByCategory[cat.category] ?? [];
              const catInstallments = filterInstallments(rawInstallments, user);
              const hasDetail = catInstallments.length > 0;

              return (
                <Fragment key={cat.category}>
                  <div
                    className={`detalle-cat-row${showHogar ? ' detalle-cat-row--hogar' : ''}`}
                    onClick={() => hasDetail && setExpandedCategory(isExpanded ? null : cat.category)}
                    style={{ cursor: hasDetail ? 'pointer' : 'default' }}
                  >
                    <span className="card-text detalle-cat-row__label">
                      {hasDetail && (
                        <span
                          className="detalle-cat-row__chevron"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                        >▶</span>
                      )}
                      <span>{cat.category}</span>
                    </span>
                    {!showHogar && (
                      <span className="card-meta detalle-cat-row__num">
                        {cat.personal > 0 ? `$${fmtAmt(cat.personal)}` : '-'}
                      </span>
                    )}
                    <span className="card-meta detalle-cat-row__num">
                      {showHogar ? `$${fmtAmt(cat.shared)}` : (cat.shared > 0 ? `$${fmtAmt(cat.shared)}` : '-')}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="detalle-tx-wrap">
                      {catInstallments.map((item, i) => {
                        const isForeign = item.currency === 'USD' || item.currency === 'EUR';
                        const amount = isForeign ? item.installmentAmount.toFixed(2) : fmtAmt(item.installmentAmount);
                        const noteKey = `${item.id}-${i}`;
                        return (
                          <div key={noteKey} className="detalle-tx">
                            <PayerBadge payer={slotForUser(item.user, config)} shared={item.shared} />
                            <div className="detalle-tx__main">
                              <div className="detalle-tx__line1">
                                <span className="detalle-tx__date">{fmtDate(item.period)}</span>
                                <span className="detalle-tx__amount">
                                  ${amount} <span className="detalle-tx__ccy">{item.currency}</span>
                                </span>
                              </div>
                              {item.notes && (
                                <div className="detalle-tx__desc" title={item.notes}>
                                  {item.notes}
                                </div>
                              )}
                              {item.installments > 1 && (
                                <div className="detalle-tx__line2">cuota {item.installmentNumber}/{item.installments}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="detalle-tx__footer">
                        <span>{catInstallments.length} cuota{catInstallments.length !== 1 ? 's' : ''}</span>
                        <span className="detalle-tx__footer-total">${cat.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}

            {/* Grand total row */}
            <div
              className={`detalle-cat-row${showHogar ? ' detalle-cat-row--hogar' : ''}`}
              style={{ paddingTop: '0.4rem', marginTop: '0.25rem' }}
            >
              <span className="card-title">Total</span>
              {!showHogar && (
                <span className="card-title detalle-cat-row__num">${fmtAmt(totalPersonal)}</span>
              )}
              <span className="card-title detalle-cat-row__num">
                {showHogar ? `$${fmtAmt(grandTotal)}` : `$${fmtAmt(totalShared)}`}
              </span>
            </div>
          </div>
        ) : (
          <span className="helper-text" style={{ marginTop: '0.5rem', display: 'block' }}>Sin datos</span>
        )}
      </div>
    </Card>
  );
}
