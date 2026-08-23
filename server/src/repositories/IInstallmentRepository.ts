import type { InstallmentExpense } from '../domain/installmentExpense';

/**
 * Read-only access to the installment expansion, one row per purchase per installment
 * month. It is derived from `expenses` in every datasource and must never be written to
 * directly. `month` is 'YYYY-MM'.
 */
export interface IInstallmentRepository {
  getByCategory(category: string, user?: string): Promise<InstallmentExpense[]>;
  getByMonth(month: string, user?: string): Promise<InstallmentExpense[]>;
  getByMonthAndCategory(month: string, category: string, user?: string): Promise<InstallmentExpense[]>;
}
