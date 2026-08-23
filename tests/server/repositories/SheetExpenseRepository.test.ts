import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { XlsxSheetProvider } from '../../helpers/xlsxSheetProvider';
import { SheetExpenseRepository } from '../../../server/src/repositories/sheet/SheetExpenseRepository';
import type { Expense } from '../../../server/src/domain/expense';
import { DateTime } from '../../../server/src/domain/dateTime';

const FIXTURE_PATH = path.resolve(process.cwd(), 'tests/resources/expenses_db_february2026.xlsx');
const fileExists = fs.existsSync(FIXTURE_PATH);

describe.skipIf(!fileExists)('SheetExpenseRepository', () => {
  const provider = new XlsxSheetProvider(FIXTURE_PATH);
  const repo = new SheetExpenseRepository(provider);

  describe('getAll', () => {
    let expenses: Expense[];

    beforeAll(async () => {
      expenses = await repo.getAll();
    });

    it('returns rows', () => {
      expect(expenses.length).toBeGreaterThan(0);
    });

    it('every expense has a valid type', () => {
      for (const e of expenses) expect(['income', 'expense']).toContain(e.type);
    });

    it('every expense has a boolean shared field', () => {
      for (const e of expenses) expect(typeof e.shared).toBe('boolean');
    });

    it('every expense has a numeric amount', () => {
      for (const e of expenses) {
        expect(typeof e.amount).toBe('number');
        expect(isNaN(e.amount)).toBe(false);
      }
    });

    it('every expense date is YYYY-MM-DD', () => {
      for (const e of expenses) expect(e.date.toISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('every expense has a non-empty id', () => {
      for (const e of expenses) expect(e.id.length).toBeGreaterThan(0);
    });
  });

  describe('create', () => {
    const writeRepo = new SheetExpenseRepository(new XlsxSheetProvider(FIXTURE_PATH));
    let created: Expense;

    beforeAll(async () => {
      created = await writeRepo.create({
        date: DateTime.fromISO('2024-01-15'),
        category: 'test-category',
        amount: 999,
        installments: 1,
        currency: 'ARS',
        notes: 'repository write test',
        type: 'expense',
        shared: false,
        user: 'userA',
      });
    });

    it('returns the new expense with a generated id', () => {
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.amount).toBe(999);
    });

    it('expense appears in getAll after creation', async () => {
      const all = await writeRepo.getAll();
      const found = all.find(e => e.id === created.id);
      expect(found).toBeDefined();
      expect(found!.date.toISO()).toBe('2024-01-15');
    });
  });

  describe('update', () => {
    const writeRepo = new SheetExpenseRepository(new XlsxSheetProvider(FIXTURE_PATH));

    it('updated fields are reflected in getAll', async () => {
      const all = await writeRepo.getAll();
      const target = all[0];
      const updated = await writeRepo.update(target.id, { notes: '__updated__', amount: 1 });
      expect(updated).not.toBeNull();
      expect(updated!.notes).toBe('__updated__');
      expect(updated!.id).toBe(target.id);
    });

    it('returns null for unknown id', async () => {
      expect(await writeRepo.update('nonexistent-id', { notes: 'x' })).toBeNull();
    });
  });

  describe('delete', () => {
    const writeRepo = new SheetExpenseRepository(new XlsxSheetProvider(FIXTURE_PATH));

    it('deleted expense no longer appears in getAll', async () => {
      const before = await writeRepo.getAll();
      const target = before[0];
      expect(await writeRepo.delete(target.id)).toBe(true);
      const after = await writeRepo.getAll();
      expect(after.find(e => e.id === target.id)).toBeUndefined();
    });

    it('returns false for unknown id', async () => {
      expect(await writeRepo.delete('nonexistent-id')).toBe(false);
    });
  });
});
