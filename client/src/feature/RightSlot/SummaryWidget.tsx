import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useRightSlot } from '../../context/RightSlotContext';
import type { SummaryMonth, IncomeCategoryBreakdown } from '../../types';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

function aggregateTopCategories(rows: IncomeCategoryBreakdown[], n: number) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.category, (map.get(row.category) ?? 0) + row.total);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function SummaryWidget() {
  const { refreshCount, openDrawer } = useRightSlot();
  const [summary, setSummary] = useState<SummaryMonth | null>(null);
  const [topCats, setTopCats] = useState<[string, number][]>([]);
  const [loading, setLoading] = useState(true);

  const month = currentMonth();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getSummary(month),
      api.getSummaryByCategory(month, 'expense'),
    ])
      .then(([s, cats]) => {
        setSummary(s);
        setTopCats(aggregateTopCategories(cats, 3));
      })
      .catch(() => {
        setSummary(null);
        setTopCats([]);
      })
      .finally(() => setLoading(false));
  }, [month, refreshCount]);

  const totalExpenses = summary
    ? summary.sharedExpenses.total + summary.individualExpenses.userA + summary.individualExpenses.userB
    : 0;

  const totalIncome = summary
    ? summary.sharedIncomeTotal + summary.individualIncome.userA + summary.individualIncome.userB
    : 0;

  const householdSavings = summary?.householdSavings ?? 0;

  return (
    <div className="summary-widget">
      <div className="summary-widget-header">
        <span className="summary-widget-month">{summary?.monthLabel ?? month}</span>
      </div>

      {loading ? (
        <div className="summary-widget-loading">Cargando...</div>
      ) : (
        <>
          <div className="summary-widget-body">
            <div className="summary-widget-row">
              <span className="summary-widget-label">Gastos</span>
              <span className="summary-widget-value summary-widget-value--expense">
                ${fmt(totalExpenses)}
              </span>
            </div>
            <div className="summary-widget-row">
              <span className="summary-widget-label">Ingresos</span>
              <span className="summary-widget-value summary-widget-value--income">
                ${fmt(totalIncome)}
              </span>
            </div>
            <div className="summary-widget-row summary-widget-row--total">
              <span className="summary-widget-label">Ahorro</span>
              <span className={`summary-widget-value ${householdSavings >= 0 ? 'summary-widget-value--income' : 'summary-widget-value--expense'}`}>
                ${fmt(householdSavings)}
              </span>
            </div>
          </div>

          {topCats.length > 0 && (
            <div className="summary-widget-topcats">
              <div className="summary-widget-topcats-title">Top categorías</div>
              {topCats.map(([cat, total]) => (
                <div key={cat} className="summary-widget-topcat-row">
                  <span className="summary-widget-topcat-name">{cat}</span>
                  <span className="summary-widget-topcat-value">${fmt(total)}</span>
                </div>
              ))}
            </div>
          )}

          <Link to="/summary" className="summary-widget-link">
            Ver resumen completo →
          </Link>
        </>
      )}

      <button
        type="button"
        className="summary-widget-add-btn btn btn-success"
        onClick={openDrawer}
      >
        + Agregar gasto
      </button>
    </div>
  );
}
