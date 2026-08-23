import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { XlsxSheetProvider } from '../../helpers/xlsxSheetProvider';
import { SheetHabitRepository } from '../../../server/src/repositories/sheet/SheetHabitRepository';
import { sheetDateToISO } from '../../../server/src/mappers/sheetMapper';
import type { Habit as HabitDto, HabitCategory } from '../../../common/types';
import type { Habit } from '../../../server/src/domain/habit';

const FIXTURE_PATH = path.resolve(process.cwd(), 'tests/resources/expenses_db_february2026.xlsx');
const fileExists = fs.existsSync(FIXTURE_PATH);

describe.skipIf(!fileExists)('SheetHabitRepository', () => {
  const provider = new XlsxSheetProvider(FIXTURE_PATH);
  const repo = new SheetHabitRepository(provider);

  describe('getCategories', () => {
    let categories: HabitCategory[];

    beforeAll(async () => {
      categories = await repo.getCategories();
    });

    it('returns rows', () => {
      expect(categories.length).toBeGreaterThan(0);
    });

    it('every habit category has a boolean defaultValue', () => {
      for (const c of categories) expect(typeof c.defaultValue).toBe('boolean');
    });

    it('every habit category has a non-empty id', () => {
      for (const c of categories) expect(c.id.length).toBeGreaterThan(0);
    });
  });

  describe('getByMonth', () => {
    let habits: Habit[];
    let monthPrefix: string;

    beforeAll(async () => {
      const rawRows = await provider.getRows('habits', 'A:Z');
      const firstDataRow = rawRows.slice(1).find(r => r[0]);
      if (!firstDataRow) { habits = []; return; }

      const firstDate = sheetDateToISO(firstDataRow[0]);
      const [y, m] = firstDate.split('-').map(Number);
      monthPrefix = firstDate.slice(0, 7);
      habits = await repo.getByMonth(y, m);
    });

    it('returns habits for the discovered month', () => {
      expect(habits.length).toBeGreaterThan(0);
    });

    it('every habit value is boolean', () => {
      for (const h of habits) expect(typeof h.value).toBe('boolean');
    });

    it('every habit day is YYYY-MM-DD', () => {
      for (const h of habits) expect(h.day.toISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('every habit day belongs to the requested month', () => {
      for (const h of habits) expect(h.day.toISO().startsWith(monthPrefix)).toBe(true);
    });
  });
});
