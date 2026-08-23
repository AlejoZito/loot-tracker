import type { ISheetProvider } from '../../providers/ISheetProvider';
import { sheetProvider } from '../../providers/sheetProvider';
import { rowToSummaryMonth, rowToCategorySummary, sheetDateToISO, isBlankRow, SHEET_RANGES } from '../../mappers/sheetMapper';
import type { ISummaryRepository } from '../ISummaryRepository';
import type { MonthlySummary } from '../../domain/monthlySummary';
import type { CategoryTransaction } from '../../domain/categoryTransaction';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export class SheetSummaryRepository implements ISummaryRepository {
  constructor(private readonly provider: ISheetProvider) {}

  async getByMonth(year: number, month: number): Promise<MonthlySummary | null> {
    const rows = await this.provider.getRows('summary', SHEET_RANGES.summary);
    if (rows.length <= 3) return null;

    const expectedLabel = `${MONTH_NAMES[month - 1]}${year}`;
    const dataRow = rows.slice(3).find(row => {
      const label = (row[1] || '').trim();
      if (label === expectedLabel) return true;
      // monthLabel may also come through as a raw date rather than a literal formatted
      // label — e.g. a datasource that can't preserve a custom "MMMMyyyy" cell format.
      // Fall back to comparing year/month numerically in that case.
      const [y, m] = sheetDateToISO(label).split('-').map(Number);
      return y === year && m === month;
    });
    if (!dataRow) return null;

    return rowToSummaryMonth(dataRow);
  }

  async getCategoryTransactions(): Promise<CategoryTransaction[]> {
    const rows = await this.provider.getRows('summary_by_categories', SHEET_RANGES.summaryByCategories);
    if (rows.length <= 1) return [];
    return rows.slice(1).filter(r => !isBlankRow(r)).map(rowToCategorySummary);
  }
}

export const summaryRepository = new SheetSummaryRepository(sheetProvider);
