import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { XlsxSheetProvider } from '../../helpers/xlsxSheetProvider';
import { SheetCategoryRepository } from '../../../server/src/repositories/sheet/SheetCategoryRepository';
import type { Category } from '../../../common/types';

const FIXTURE_PATH = path.resolve(process.cwd(), 'tests/resources/expenses_db_february2026.xlsx');
const fileExists = fs.existsSync(FIXTURE_PATH);

describe.skipIf(!fileExists)('SheetCategoryRepository', () => {
  const provider = new XlsxSheetProvider(FIXTURE_PATH);
  const repo = new SheetCategoryRepository(provider);
  let categories: Category[];

  beforeAll(async () => {
    categories = await repo.getAll();
  });

  it('returns rows', () => {
    expect(categories.length).toBeGreaterThan(0);
  });

  it('every category has a valid type', () => {
    for (const c of categories) expect(['income', 'expense']).toContain(c.type);
  });

  it('every category user is lowercase', () => {
    for (const c of categories) expect(c.user).toBe(c.user.toLowerCase().trim());
  });
});
