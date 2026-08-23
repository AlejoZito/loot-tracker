import type { SupabaseClient } from '@supabase/supabase-js';
import { selectAll } from '../../providers/dbClient';
import {
  rowToMonthlySummary,
  rowToCategoryTransaction,
  type SummaryRow,
  type SummaryByCategoryRow,
} from '../../mappers/dbMapper';
import type { ISummaryRepository } from '../ISummaryRepository';
import type { MonthlySummary } from '../../domain/monthlySummary';
import type { CategoryTransaction } from '../../domain/categoryTransaction';

export class DbSummaryRepository implements ISummaryRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getByMonth(year: number, month: number): Promise<MonthlySummary | null> {
    const periodMonth = `${year}-${String(month).padStart(2, '0')}-01`;

    const { data, error } = await this.db
      .from('summary').select('*').eq('period_month', periodMonth).maybeSingle();
    if (error) throw new Error(`Failed to read summary for ${periodMonth}: ${error.message}`);
    if (!data) return null;

    return rowToMonthlySummary(data as SummaryRow);
  }

  async getCategoryTransactions(): Promise<CategoryTransaction[]> {
    const rows = await selectAll<SummaryByCategoryRow>(() =>
      this.db.from('summary_by_categories').select('*').order('period', { ascending: true }),
    );
    return rows.map(rowToCategoryTransaction);
  }
}
