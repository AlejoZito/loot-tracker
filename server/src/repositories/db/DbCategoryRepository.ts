import type { SupabaseClient } from '@supabase/supabase-js';
import { selectAll } from '../../providers/dbClient';
import { rowToCategory, type CategoryRow } from '../../mappers/dbMapper';
import type { ICategoryRepository } from '../ICategoryRepository';
import type { Category } from '../../domain/category';

export class DbCategoryRepository implements ICategoryRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getAll(): Promise<Category[]> {
    const rows = await selectAll<CategoryRow>(() =>
      this.db.from('categories').select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
    );
    return rows.map(rowToCategory);
  }
}
