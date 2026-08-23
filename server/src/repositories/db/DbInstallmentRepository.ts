import type { SupabaseClient } from '@supabase/supabase-js';
import { selectAll } from '../../providers/dbClient';
import {
  rowToExpense,
  rowToInstallmentExpense,
  EXPENSE_COLUMNS,
  type ExpenseRow,
  type InstallmentRow,
} from '../../mappers/dbMapper';
import type { IInstallmentRepository } from '../IInstallmentRepository';
import type { Expense } from '../../domain/expense';
import type { InstallmentExpense } from '../../domain/installmentExpense';

type Filter = (q: any) => any;

const noFilter: Filter = q => q;

/**
 * Reads `expenses_by_installments`, which holds only installment-specific columns, and
 * pairs each row with its parent expense for the category/user/currency the domain needs.
 *
 * Month filtering uses `period_key`, not the day-level `period_date`. The two diverge
 * under the `legacy_overflow` date mode, where a day-29..31 purchase lands its
 * `period_date` in the following month; `period_key` is what `summary` buckets on, so
 * filtering on it keeps the two views reporting the same rows for a month.
 */
export class DbInstallmentRepository implements IInstallmentRepository {
  constructor(private readonly db: SupabaseClient) {}

  private async compose(onExpenses: Filter, onInstallments: Filter): Promise<InstallmentExpense[]> {
    const [expenseRows, installmentRows] = await Promise.all([
      selectAll<ExpenseRow>(() =>
        onExpenses(this.db.from('expenses').select(EXPENSE_COLUMNS)).order('id', { ascending: true }),
      ),
      selectAll<InstallmentRow>(() =>
        onInstallments(this.db.from('expenses_by_installments').select('*'))
          .order('period_date', { ascending: false })
          .order('expense_id', { ascending: true })
          .order('installment_number', { ascending: true }),
      ),
    ]);

    const byId = new Map<string, Expense>(expenseRows.map(r => [r.id, rowToExpense(r)]));
    const out: InstallmentExpense[] = [];
    for (const row of installmentRows) {
      const expense = byId.get(row.expense_id);
      if (expense) out.push(rowToInstallmentExpense(row, expense));
    }
    return out;
  }

  async getByCategory(category: string, user?: string): Promise<InstallmentExpense[]> {
    return this.compose(
      q => (user ? q.eq('category', category).eq('user_id', user) : q.eq('category', category)),
      noFilter,
    );
  }

  async getByMonth(month: string, user?: string): Promise<InstallmentExpense[]> {
    return this.compose(
      q => (user ? q.eq('user_id', user) : q),
      q => q.eq('period_key', month),
    );
  }

  async getByMonthAndCategory(month: string, category: string, user?: string): Promise<InstallmentExpense[]> {
    return this.compose(
      q => (user ? q.eq('category', category).eq('user_id', user) : q.eq('category', category)),
      q => q.eq('period_key', month),
    );
  }
}
