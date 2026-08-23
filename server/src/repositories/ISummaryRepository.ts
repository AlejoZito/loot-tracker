import type { MonthlySummary } from '../domain/monthlySummary';
import type { CategoryTransaction } from '../domain/categoryTransaction';

export interface ISummaryRepository {
  getByMonth(year: number, month: number): Promise<MonthlySummary | null>;
  getCategoryTransactions(): Promise<CategoryTransaction[]>;
}
