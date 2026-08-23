import type { SupabaseClient } from '@supabase/supabase-js';
import { selectAll } from '../../providers/dbClient';
import { rowToInstallmentExpense, type InstallmentRow } from '../../mappers/dbMapper';
import type { IInstallmentRepository } from '../IInstallmentRepository';
import type { InstallmentExpense } from '../../domain/installmentExpense';

/**
 * Reads the `expenses_by_installments` view.
 *
 * Month filtering uses `period_key`, not the day-level `period_date`. The two diverge
 * under the `legacy_overflow` date mode, where a day-29..31 purchase lands its
 * `period_date` in the following month; `period_key` is what `summary` buckets on, so
 * filtering on it keeps the two views reporting the same rows for a month.
 */
export class DbInstallmentRepository implements IInstallmentRepository {
  constructor(private readonly db: SupabaseClient) {}

  private async query(
    apply: (q: any) => any,
  ): Promise<InstallmentExpense[]> {
    const rows = await selectAll<InstallmentRow>(() =>
      apply(this.db.from('expenses_by_installments').select('*'))
        .order('period_date', { ascending: true }),
    );
    return rows.map(rowToInstallmentExpense);
  }

  async getByCategory(category: string, user?: string): Promise<InstallmentExpense[]> {
    return this.query(q => {
      q = q.eq('category', category);
      return user ? q.eq('user_id', user) : q;
    });
  }

  async getByMonth(month: string, user?: string): Promise<InstallmentExpense[]> {
    return this.query(q => {
      q = q.eq('period_key', month);
      return user ? q.eq('user_id', user) : q;
    });
  }

  async getByMonthAndCategory(month: string, category: string, user?: string): Promise<InstallmentExpense[]> {
    return this.query(q => {
      q = q.eq('period_key', month).eq('category', category);
      return user ? q.eq('user_id', user) : q;
    });
  }
}
