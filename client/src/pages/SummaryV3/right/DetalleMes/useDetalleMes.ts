import { useState, useEffect } from 'react';
import { api } from '../../../../services/api';
import type { SummaryMonth, IncomeCategoryBreakdown, InstallmentExpense } from '../../../../types';

export type DetalleMesData = {
  summary: SummaryMonth | null;
  expenses: IncomeCategoryBreakdown[];
  income: IncomeCategoryBreakdown[];
  installments: InstallmentExpense[];
  loading: boolean;
  error: string;
};

export function useDetalleMes(month: string): DetalleMesData {
  const [state, setState] = useState<DetalleMesData>({
    summary: null, expenses: [], income: [], installments: [], loading: true, error: '',
  });

  useEffect(() => {
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true, error: '' }));
    Promise.all([
      api.getSummary(month),
      api.getSummaryByCategory(month, 'expense'),
      api.getSummaryByCategory(month, 'income'),
      api.getInstallmentsByMonth(month),
    ])
      .then(([summary, expenses, income, installments]) => {
        if (!cancelled) setState({ summary, expenses, income, installments, loading: false, error: '' });
      })
      .catch(() => {
        if (!cancelled) setState({ summary: null, expenses: [], income: [], installments: [], loading: false, error: 'Error al cargar datos' });
      });
    return () => { cancelled = true; };
  }, [month]);

  return state;
}
