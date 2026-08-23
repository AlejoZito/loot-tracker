import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { XlsxSheetProvider } from '../../helpers/xlsxSheetProvider';
import { SheetSummaryRepository } from '../../../server/src/repositories/sheet/SheetSummaryRepository';
import { CategoryTransaction } from '../../../server/src/domain/categoryTransaction';
import type { SummaryMonth } from '../../../common/types';

const FIXTURE_PATH = path.resolve(process.cwd(), 'tests/resources/expenses_db_february2026.xlsx');
const fileExists = fs.existsSync(FIXTURE_PATH);

describe.skipIf(!fileExists)('SheetSummaryRepository', () => {
  const provider = new XlsxSheetProvider(FIXTURE_PATH);
  const repo = new SheetSummaryRepository(provider);

  describe('getByMonth', () => {
    let summary: SummaryMonth | null;

    beforeAll(async () => {
      summary = await repo.getByMonth(2024, 6);
    });

    it('returns a summary for an existing month', () => {
      expect(summary).not.toBeNull();
    });

    it('year is a number', () => {
      expect(typeof summary!.year).toBe('number');
    });

    it('all financial totals are numbers', () => {
      expect(typeof summary!.totalIncome.userA).toBe('number');
      expect(typeof summary!.totalIncome.userB).toBe('number');
      expect(typeof summary!.totalExpenses.userA).toBe('number');
      expect(typeof summary!.householdSavings).toBe('number');
    });
  });

  describe('getCategoryTransactions', () => {
    it('returns an array of CategoryTransaction instances', async () => {
      const result = await repo.getCategoryTransactions();
      expect(Array.isArray(result)).toBe(true);
      for (const r of result) {
        expect(r).toBeInstanceOf(CategoryTransaction);
        expect(typeof r.amount).toBe('number');
        expect(['income', 'expense']).toContain(r.type);
      }
    });
  });
});
