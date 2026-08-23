import type { ISheetProvider } from '../../providers/ISheetProvider';
import { sheetProvider } from '../../providers/sheetProvider';
import { rowToInstallmentExpense, SHEET_RANGES } from '../../mappers/sheetMapper';
import type { IInstallmentRepository } from '../IInstallmentRepository';
import type { InstallmentExpense } from '../../domain/installmentExpense';

const newestFirst = (a: InstallmentExpense, b: InstallmentExpense) =>
  b.period.toISO().localeCompare(a.period.toISO());

export class SheetInstallmentRepository implements IInstallmentRepository {
  constructor(private provider: ISheetProvider) {}

  async getByCategory(category: string, user?: string): Promise<InstallmentExpense[]> {
    const rows = await this.provider.getRows('expenses_by_installments', SHEET_RANGES.expensesByInstallments);
    return rows.slice(1)
      .map(rowToInstallmentExpense)
      .filter((e): e is InstallmentExpense => e !== null)
      .filter(e => e.category === category && (!user || e.user === user))
      .sort(newestFirst);
  }

  async getByMonth(month: string, user?: string): Promise<InstallmentExpense[]> {
    const rows = await this.provider.getRows('expenses_by_installments', SHEET_RANGES.expensesByInstallments);
    return rows.slice(1)
      .map(rowToInstallmentExpense)
      .filter((e): e is InstallmentExpense => e !== null)
      .filter(e => e.period.toISO().startsWith(month) && (!user || e.user === user))
      .sort(newestFirst);
  }

  async getByMonthAndCategory(month: string, category: string, user?: string): Promise<InstallmentExpense[]> {
    const rows = await this.provider.getRows('expenses_by_installments', SHEET_RANGES.expensesByInstallments);
    return rows.slice(1)
      .map(rowToInstallmentExpense)
      .filter((e): e is InstallmentExpense => e !== null)
      .filter(e =>
        e.period.toISO().startsWith(month) &&
        e.category === category &&
        (!user || e.user === user),
      )
      .sort(newestFirst);
  }
}

export const installmentRepository = new SheetInstallmentRepository(sheetProvider);
