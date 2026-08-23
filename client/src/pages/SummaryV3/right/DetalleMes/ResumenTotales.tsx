import { useState, Fragment } from 'react';
import { Card } from '../../../../components/primitives/Card/Card';
import type { SummaryMonth, IncomeCategoryBreakdown } from '../../../../types';
import type { UserFilter } from '../../state';
import { fmtAmt } from '../../utils/dates';
import { useBudgetConfig } from '../../../../context/BudgetConfigContext';

interface Props {
  summary: SummaryMonth;
  user: UserFilter;
  income: IncomeCategoryBreakdown[];
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span style={{
      fontSize: '0.5rem',
      display: 'inline-block',
      transform: open ? 'rotate(90deg)' : 'none',
      transition: 'transform 0.15s',
      lineHeight: 1,
      flexShrink: 0,
    }}>▶</span>
  );
}

function colored(v: number) {
  return v >= 0 ? 'var(--accent)' : 'var(--destructive)';
}

function IncomeExpandable({
  total,
  rows,
  label,
  color,
}: {
  total: number;
  rows: { category: string; amount: number }[];
  label: string;
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasRows = rows.length > 0;
  return (
    <Fragment>
      <div
        className="summary-row summary-row-total"
        onClick={() => hasRows && setOpen(o => !o)}
        style={{ cursor: hasRows ? 'pointer' : 'default' }}
      >
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {hasRows && <Chevron open={open} />}
          {label}
        </span>
        <span className="card-title" style={color ? { color } : undefined}>${fmtAmt(total)}</span>
      </div>
      {open && rows.map(r => (
        <div key={r.category} className="summary-row">
          <span className="card-text summary-row-label">{r.category}</span>
          <span className="card-meta summary-row-value" style={{ color: 'var(--accent)' }}>
            +${fmtAmt(r.amount)}
          </span>
        </div>
      ))}
    </Fragment>
  );
}

export function ResumenTotales({ summary, user, income }: Props) {
  const { labelForSlot } = useBudgetConfig();
  if (user === 'all') {
    const personalAll = summary.individualExpenses.userA + summary.individualExpenses.userB;
    const sharedAll = summary.sharedExpenses.total;
    const totalExp = personalAll + sharedAll;
    const sharedInc = summary.sharedIncomeTotal;
    const ahorroB = sharedInc - totalExp;

    // Aggregate all income across users per category
    const incMap: Record<string, number> = {};
    income.forEach(c => { incMap[c.category] = (incMap[c.category] ?? 0) + c.total; });
    const totalIncAll = Object.values(incMap).reduce((s, v) => s + v, 0);
    const incomeRows = Object.entries(incMap).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));

    return (
      <Card as="section">
        <div className="summary-card-inner">
          <h3 className="card-title summary-section-title">Resumen</h3>

          <div className="summary-subtotals">
            <div className="summary-row summary-row-total">
              <span className="card-title">Total gastos</span>
              <span className="card-title">${fmtAmt(totalExp)}</span>
            </div>
            <div className="summary-row">
              <span className="card-text summary-row-label">Gastos personales</span>
              <span className="card-meta summary-row-value">${fmtAmt(personalAll)}</span>
            </div>
            <div className="summary-row">
              <span className="card-text summary-row-label">Gastos compartidos</span>
              <span className="card-meta summary-row-value">${fmtAmt(sharedAll)}</span>
            </div>
          </div>

          <div className="summary-subtotals">
            <IncomeExpandable total={totalIncAll} rows={incomeRows} label="Total ingresos" color="var(--accent)" />
          </div>

          <div className="summary-subtotals">
            <div className="summary-row summary-row-total">
              <span className="card-title">Ahorro bruto</span>
              <span className="card-title" style={{ color: colored(ahorroB) }}>${fmtAmt(ahorroB)}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (user === 'household') {
    const sharedExp = summary.sharedExpenses.total;
    const sharedInc = summary.sharedIncomeTotal;
    const ahorroHogar = sharedInc - sharedExp;
    const { saldo } = summary;
    const owes = saldo.aToB > 0
      ? `${labelForSlot('userA')} le debe $${fmtAmt(saldo.aToB)} a ${labelForSlot('userB')}`
      : saldo.bToA > 0
      ? `${labelForSlot('userB')} le debe $${fmtAmt(saldo.bToA)} a ${labelForSlot('userA')}`
      : 'Sin deuda pendiente';

    // Shared income by category (sum c.shared across users)
    const sharedIncMap: Record<string, number> = {};
    income.forEach(c => {
      if (c.shared > 0) sharedIncMap[c.category] = (sharedIncMap[c.category] ?? 0) + c.shared;
    });
    const sharedIncRows = Object.entries(sharedIncMap).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));

    return (
      <Card as="section">
        <div className="summary-card-inner">
          <h3 className="card-title summary-section-title">Resumen · Hogar</h3>

          <div className="summary-subtotals">
            <div className="summary-row summary-row-total">
              <span className="card-title">Gastos compartidos</span>
              <span className="card-title">${fmtAmt(sharedExp)}</span>
            </div>
          </div>

          <div className="summary-subtotals">
            <IncomeExpandable total={sharedInc} rows={sharedIncRows} label="Ingresos compartidos" color="var(--accent)" />
          </div>

          <div className="summary-subtotals">
            <div className="summary-row summary-row-total">
              <span className="card-title">Ahorro hogar</span>
              <span className="card-title" style={{ color: colored(ahorroHogar) }}>
                {ahorroHogar >= 0 ? '+' : ''}${fmtAmt(ahorroHogar)}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.5rem', background: 'var(--surface-alt, rgba(128,128,128,0.08))', borderRadius: 6 }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted-fg)', margin: 0 }}>{owes}</p>
          </div>
        </div>
      </Card>
    );
  }

  // userA | userB
  const totalExp = summary.totalExpenses[user];
  const indExp = summary.individualExpenses[user];
  const sharedExp = summary.sharedExpenses[user];
  const totalInc = summary.totalIncome[user];
  const savings = summary.savings[user];
  const rawSavings = totalInc - totalExp;

  const saldoReceived = user === 'userB' ? summary.saldo.aToB : summary.saldo.bToA;
  const saldoOwed = user === 'userB' ? summary.saldo.bToA : summary.saldo.aToB;
  const netSaldo = saldoReceived - saldoOwed;

  const userIncomeRows = income
    .filter(c => c.user === user)
    .sort((a, b) => b.total - a.total)
    .map(c => ({ category: c.category, amount: c.total }));

  return (
    <Card as="section">
      <div className="summary-card-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title summary-section-title">Resumen</h3>
          <span style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>
            {labelForSlot(user as 'userA' | 'userB')}
          </span>
        </div>

        <div className="summary-subtotals">
          <div className="summary-row summary-row-total">
            <span className="card-title">Total gastos</span>
            <span className="card-title">${fmtAmt(totalExp)}</span>
          </div>
          <div className="summary-row">
            <span className="card-text summary-row-label">Gastos personales</span>
            <span className="card-meta summary-row-value">${fmtAmt(indExp)}</span>
          </div>
          <div className="summary-row">
            <span className="card-text summary-row-label">Gastos compartidos</span>
            <span className="card-meta summary-row-value">${fmtAmt(sharedExp)}</span>
          </div>
        </div>

        <div className="summary-subtotals">
          <IncomeExpandable total={totalInc} rows={userIncomeRows} label="Total ingresos" color="var(--accent)" />
        </div>

        <div className="summary-subtotals">
          <div className="summary-row summary-row-total">
            <span className="card-title">Ahorro personal</span>
            <span className="card-title" style={{ color: colored(savings) }}>${fmtAmt(savings)}</span>
          </div>
          <div className="summary-row">
            <span className="card-text summary-row-label">Ahorro bruto</span>
            <span className="card-meta summary-row-value" style={{ color: colored(rawSavings) }}>${fmtAmt(rawSavings)}</span>
          </div>
          {netSaldo !== 0 && (
            <div className="summary-row">
              <span className="card-text summary-row-label">
                {netSaldo > 0 ? 'Saldo a cobrar' : 'Saldo a pagar'}
              </span>
              <span className="card-meta summary-row-value" style={{ color: netSaldo > 0 ? 'var(--accent)' : 'var(--destructive)' }}>
                {netSaldo > 0 ? '+' : '-'}${fmtAmt(Math.abs(netSaldo))}
              </span>
            </div>
          )}
          {totalInc === 0 && rawSavings < 0 && (
            <p className="helper-text" style={{ fontSize: '0.65rem', marginTop: '0.1rem' }}>
              Sin ingresos registrados este mes
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
