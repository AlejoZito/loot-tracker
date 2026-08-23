import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'crypto';
import { GoogleSheetProvider } from '../../../server/src/providers/googleSheetProvider';
import { rowToExpense, expenseToRow, SHEET_RANGES, parseSheetCurrency } from '../../../server/src/mappers/sheetMapper';
import type { Expense } from '../../../common/types';

const RUN_E2E = process.env.RUN_E2E === 'true';
const E2E_SPREADSHEET_ID = process.env.E2E_SPREADSHEET_ID ?? '';
const E2E_SHEET_NAME = process.env.E2E_SHEET_NAME ?? 'expenses';

// Marker used to identify rows written by this test suite
const TEST_NOTES_MARKER = '__e2e_test__';

describe.skipIf(!RUN_E2E || !E2E_SPREADSHEET_ID)('sheetsService E2E (real Google Sheets)', () => {
  const provider = new GoogleSheetProvider(E2E_SPREADSHEET_ID);

  describe(`write + read expense on expenses_test sheet [${new Date().toISOString()}]`, () => {
    const testId = randomUUID().slice(0, 8);
    const today = new Date().toISOString().slice(0, 10);
    const testExpense: Expense = {
      id: testId,
      date: today,
      category: 'e2e-test',
      amount: 42,
      installments: 1,
      currency: 'ARS',
      notes: TEST_NOTES_MARKER,
      type: 'expense',
      shared: false,
      user: 'userA',
    };

    beforeAll(async () => {
      await provider.appendValues(
        E2E_SHEET_NAME,
        SHEET_RANGES.expenses,
        [expenseToRow(testExpense)],
      );
    });

    it('raw row is present in the sheet', async () => {
      const rows = await provider.getRows(E2E_SHEET_NAME, SHEET_RANGES.expenses);
      const raw = rows.slice(1).find(r => r[0] === testId);
      expect(raw).toBeDefined();
    });

    it('raw row has correct column values', async () => {
      const rows = await provider.getRows(E2E_SHEET_NAME, SHEET_RANGES.expenses);
      const raw = rows.slice(1).find(r => r[0] === testId)!;

      const [id, , category, amount, installments, currency, notes, type, shared, user] = raw;

      expect(id).toBe(testId);
      expect(category).toBe('e2e-test');
      // amount may be currency-formatted by the sheet (e.g. "$ 42"), use parseSheetCurrency
      expect(parseSheetCurrency(amount)).toBe(42);
      expect(Number(installments)).toBe(1);
      expect(currency).toBe('ARS');
      expect(notes).toContain(TEST_NOTES_MARKER);
      expect(['Egreso', 'Ingreso']).toContain(type);
      expect(['Si', 'No']).toContain(shared);
      expect(user).toBe('userA');
    });

    it('mapped DTO has all correct fields', async () => {
      const rows = await provider.getRows(E2E_SHEET_NAME, SHEET_RANGES.expenses);
      const raw = rows.slice(1).find(r => r[0] === testId)!;
      const dto = rowToExpense(raw);

      expect(dto.id).toBe(testId);
      expect(dto.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dto.date).toBe(today);
      expect(dto.category).toBe('e2e-test');
      expect(typeof dto.amount).toBe('number');
      expect(dto.amount).toBe(42);
      expect(dto.installments).toBe(1);
      expect(dto.currency).toBe('ARS');
      expect(dto.notes).toContain(TEST_NOTES_MARKER);
      expect(dto.type).toBe('expense');
      expect(dto.shared).toBe(false);
      expect(dto.user).toBe('userA');
    });

    it('logs the spreadsheet URL for manual inspection', () => {
      const url = `https://docs.google.com/spreadsheets/d/${E2E_SPREADSHEET_ID}/edit`;
      console.log(`\nE2E test row written. Inspect at:\n${url}\nSheet: ${E2E_SHEET_NAME}\nRow id: ${testId}\n`);
      expect(true).toBe(true);
    });
  });
});
