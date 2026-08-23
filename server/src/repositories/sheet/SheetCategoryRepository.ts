import type { ISheetProvider } from '../../providers/ISheetProvider';
import { sheetProvider } from '../../providers/sheetProvider';
import { rowToCategory, isBlankRow, SHEET_RANGES } from '../../mappers/sheetMapper';
import type { ICategoryRepository } from '../ICategoryRepository';
import type { Category } from '../../domain/category';

export class SheetCategoryRepository implements ICategoryRepository {
  constructor(private readonly provider: ISheetProvider) {}

  async getAll(): Promise<Category[]> {
    const rows = await this.provider.getRows('expenses-categories', SHEET_RANGES.categories);
    if (rows.length <= 1) return [];
    return rows.slice(1).filter(r => !isBlankRow(r)).map(rowToCategory);
  }
}

export const categoryRepository = new SheetCategoryRepository(sheetProvider);
