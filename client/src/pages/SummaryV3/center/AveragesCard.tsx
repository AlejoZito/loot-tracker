import { useMemo } from 'react';
import type { CategoryHistoryRow } from '../../../types';
import { Card } from '../../../components/primitives/Card/Card';
import { fmtAmt } from '../utils/dates';
import { CATEGORY_COLORS } from '../utils/colors';
import type { UserFilter } from '../state';

interface Props {
  filteredMonths: string[];
  filteredData: CategoryHistoryRow[];
  user: UserFilter;
}

export function AveragesCard({ filteredMonths, filteredData, user }: Props) {
  const numMonths = filteredMonths.length || 1;

  const { categoryStats, incomeTotal, incomeAvg } = useMemo(() => {
    const totals: Record<string, number> = {};
    let income = 0;

    filteredMonths.forEach(period => {
      const monthRows = filteredData.filter(r => r.period === period);
      const expenseRows = monthRows.filter(r => r.type === 'expense');
      const incomeRows = monthRows.filter(r => r.type === 'income');

      if (user === 'household') {
        expenseRows.filter(r => r.shared > 0).forEach(r => {
          totals[r.category] = (totals[r.category] || 0) + r.shared;
        });
        income += incomeRows.filter(r => r.shared > 0).reduce((s, r) => s + r.shared, 0);
      } else if (user === 'all') {
        expenseRows.forEach(r => {
          totals[r.category] = (totals[r.category] || 0) + r.personal + r.shared;
        });
        income += incomeRows.reduce((s, r) => s + r.personal + r.shared, 0);
      } else {
        expenseRows.filter(r => r.user === user).forEach(r => {
          totals[r.category] = (totals[r.category] || 0) + r.personal + r.shared;
        });
        income += incomeRows.filter(r => r.user === user).reduce((s, r) => s + r.personal + r.shared, 0);
      }
    });

    const categoryStats = Object.entries(totals)
      .map(([cat, total]) => ({ cat, total, avg: total / numMonths }))
      .filter(x => x.avg > 0)
      .sort((a, b) => b.avg - a.avg);

    return { categoryStats, incomeTotal: income, incomeAvg: income / numMonths };
  }, [filteredMonths, filteredData, user, numMonths]);

  const overallAvg = categoryStats.reduce((s, x) => s + x.avg, 0);
  const expenseTotal = categoryStats.reduce((s, x) => s + x.total, 0);
  const savingsTotal = incomeTotal - expenseTotal;
  const savingsAvg = savingsTotal / numMonths;
  const savingsPct = incomeTotal > 0 ? Math.round((savingsTotal / incomeTotal) * 100) : 0;
  const maxTotal = Math.max(1, ...categoryStats.map(x => x.total));

  return (
    <Card as="section">
      <div className="summary-card-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 className="card-title summary-section-title">3 · Promedios</h3>
          <span style={{ fontSize: '0.62rem', color: 'var(--muted-fg)' }}>
            {filteredMonths.length} {filteredMonths.length === 1 ? 'mes' : 'meses'}
          </span>
        </div>

        <div className="summary-subtotals" style={{ marginBottom: '0.5rem' }}>
          <div className="summary-row summary-row-total">
            <span className="card-title">Promedio mensual</span>
            <span className="card-title">${fmtAmt(overallAvg)}</span>
          </div>
        </div>

        <div className="avg-rank-list">
          {incomeTotal > 0 && (
            <div className="avg-rank-row avg-rank-row--income">
              <div className="avg-rank-row__head">
                <span className="avg-rank-row__cat">Ingresos</span>
                <span className="avg-rank-row__total">${fmtAmt(incomeTotal)}</span>
              </div>
              <div className="avg-rank-row__track">
                <div
                  className="avg-rank-row__bar avg-rank-row__bar--income"
                  style={{ width: `${Math.min(100, (incomeTotal / maxTotal) * 100)}%` }}
                />
              </div>
              <span className="avg-rank-row__sub">${fmtAmt(incomeAvg)} /mes</span>
            </div>
          )}
          {incomeTotal > 0 && (
            <div className="avg-rank-row avg-rank-row--savings">
              <div className="avg-rank-row__head">
                <span className="avg-rank-row__cat">
                  Ahorro
                  <span className="avg-rank-row__pct"> ({savingsPct}%)</span>
                </span>
                <span
                  className={`avg-rank-row__total ${
                    savingsTotal >= 0 ? 'summary-saldo-positive' : 'summary-saldo-negative'
                  }`}
                >
                  ${fmtAmt(savingsTotal)}
                </span>
              </div>
              <div className="avg-rank-row__track">
                {/* Same reference as the Ingresos bar above: share of income, not of max category */}
                <div
                  className={`avg-rank-row__bar avg-rank-row__bar--${
                    savingsTotal >= 0 ? 'savings' : 'savings-negative'
                  }`}
                  style={{ width: `${Math.min(100, (Math.abs(savingsTotal) / incomeTotal) * 100)}%` }}
                />
              </div>
              <span className="avg-rank-row__sub">${fmtAmt(savingsAvg)} /mes</span>
            </div>
          )}
          {categoryStats.map(({ cat, avg, total }, i) => (
            <div key={cat} className="avg-rank-row">
              <div className="avg-rank-row__head">
                <span className="avg-rank-row__cat">
                  {cat}
                  {incomeTotal > 0 && (
                    <span className="avg-rank-row__pct"> ({Math.round((total / incomeTotal) * 100)}%)</span>
                  )}
                </span>
                <span className="avg-rank-row__total">${fmtAmt(total)}</span>
              </div>
              <div className="avg-rank-row__track">
                <div
                  className="avg-rank-row__bar"
                  style={{ width: `${(total / maxTotal) * 100}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                />
              </div>
              <span className="avg-rank-row__sub">${fmtAmt(avg)} /mes</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
