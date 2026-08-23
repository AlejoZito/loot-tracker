import { useState } from 'react';
import type { UserFilter, V3Action } from '../../state';
import { useDetalleMes } from './useDetalleMes';
import { ResumenTotales } from './ResumenTotales';
import { GastosPorCategoriaTable } from './GastosPorCategoriaTable';
import { shortMonth } from '../../utils/dates';
import { BottomSheet } from '../../../../components/primitives/BottomSheet/BottomSheet';

interface Props {
  month: string;
  user: UserFilter;
  budgetUser: string | null;
  availableMonths: string[];
  dispatch: React.Dispatch<V3Action>;
}

export function DetalleMes({ month, user, budgetUser: _budgetUser, availableMonths, dispatch }: Props) {
  const { summary, expenses, income, installments, loading, error } = useDetalleMes(month);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sortedMonths = [...availableMonths].sort().reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <button
        className="summary-month-trigger"
        onClick={() => setSheetOpen(true)}
        disabled={sortedMonths.length === 0}
      >
        {shortMonth(month)}
        {sortedMonths.length > 0 && <span className="summary-month-trigger__chevron">▾</span>}
      </button>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Mes">
        {sortedMonths.map(m => (
          <button
            key={m}
            onClick={() => { dispatch({ type: 'SELECT_MONTH', month: m }); setSheetOpen(false); }}
            className={`bottom-sheet__option${m === month ? ' bottom-sheet__option--active' : ''}`}
            style={{ textTransform: 'capitalize' }}
          >
            <span>{shortMonth(m)}</span>
            {m === month && <span>✓</span>}
          </button>
        ))}
      </BottomSheet>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <span className="helper-text">Cargando...</span>
        </div>
      ) : error || !summary ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <span className="helper-text">{error || 'Sin datos'}</span>
        </div>
      ) : (
        <>
          <ResumenTotales summary={summary} user={user} income={income} />
          <GastosPorCategoriaTable expenses={expenses} installments={installments} user={user} />
        </>
      )}
    </div>
  );
}
