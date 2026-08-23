import { useReducer, useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../../services/api';
import type { CategoryHistoryRow } from '../../types';
import { reducer, initialState } from './state';
import { currentPeriod, filterMonths } from './utils/dates';
import { TopBar } from './TopBar';
import { EvolutionCard } from './center/EvolutionCard';
import { IncomeVsExpensesCard } from './center/IncomeVsExpensesCard';
import { AveragesCard } from './center/AveragesCard';
import { RightPanel } from './right/RightPanel';

interface Props {
  budgetUser: string | null;
}

export default function SummaryV3({ budgetUser }: Props) {
  const [data, setData] = useState<CategoryHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [state, dispatch] = useReducer(reducer, budgetUser, initialState);
  const [mobileTab, setMobileTab] = useState<'analisis' | 'detalle'>('analisis');

  useEffect(() => {
    api.getCategoryHistory()
      .then(rows => {
        setData(rows);
        const cap = currentPeriod();
        const months = [...new Set(rows.map(r => r.period))].sort().filter(m => m <= cap);
        if (months.length > 0) {
          const mostRecent = months[months.length - 1];
          dispatch({ type: 'SELECT_MONTH', month: mostRecent });
        }
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  const allMonths = useMemo(() => {
    const cap = currentPeriod();
    return [...new Set(data.map(r => r.period))].sort().filter(m => m <= cap);
  }, [data]);

  const filteredMonths = useMemo(
    () => filterMonths(allMonths, state.filters.range),
    [allMonths, state.filters.range],
  );

  const filteredData = useMemo(
    () => data.filter(r => filteredMonths.includes(r.period)),
    [data, filteredMonths],
  );

  const handleSetRange = (range: typeof state.filters.range) => {
    const preview = filterMonths(allMonths, range);
    dispatch({ type: 'SET_RANGE', range, availableMonths: preview });
  };

  const wrappedDispatch: React.Dispatch<Parameters<typeof dispatch>[0]> = (action) => {
    if (action.type === 'SET_RANGE') {
      handleSetRange(action.range);
    } else {
      dispatch(action);
    }
  };

  const selectMonth = useCallback((month: string) => {
    dispatch({ type: 'SELECT_MONTH', month });
    setMobileTab('detalle');
  }, []);

  if (loading) {
    return (
      <div className="expense-list-page page-bg">
        <div className="expense-list-container content-panel">
          <div className="expense-list-empty">
            <span className="helper-text">Cargando...</span>
          </div>
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

  const TABS = [
    { id: 'analisis', label: 'Análisis' },
    { id: 'detalle', label: 'Detalle mes' },
  ] as const;

  return (
    <div className="page-bg" style={{ padding: '1rem' }}>
      <TopBar
        user={state.filters.user}
        range={state.filters.range}
        dispatch={wrappedDispatch}
      />

      <div className="summary-v3-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className="btn"
            onClick={() => setMobileTab(tab.id)}
            style={{
              fontSize: '0.75rem',
              padding: '0.35rem 1.1rem',
              opacity: mobileTab === tab.id ? 1 : 0.4,
              fontWeight: mobileTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="summary-v3-layout">
        <div className={`summary-v3-panel${mobileTab === 'analisis' ? ' summary-v3-panel--active' : ''}`}>
          <EvolutionCard
            filteredMonths={filteredMonths}
            filteredData={filteredData}
            user={state.filters.user}
            onSelectMonth={selectMonth}
          />
          <IncomeVsExpensesCard
            filteredMonths={filteredMonths}
            filteredData={filteredData}
            user={state.filters.user}
            onSelectMonth={selectMonth}
          />
          <AveragesCard
            filteredMonths={filteredMonths}
            filteredData={filteredData}
            user={state.filters.user}
          />
        </div>

        <div
          className={`summary-v3-panel${mobileTab === 'detalle' ? ' summary-v3-panel--active' : ''}`}
          style={{ position: 'sticky', top: '1rem' }}
        >
          <RightPanel
            state={state}
            dispatch={wrappedDispatch}
            budgetUser={budgetUser}
            availableMonths={filteredMonths}
          />
        </div>
      </div>
    </div>
  );
}
