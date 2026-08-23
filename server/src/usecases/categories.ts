import { categoryRepository } from '../repositories/sheet/SheetCategoryRepository';
import type { Category } from '../domain/category';

export async function getAllCategories(): Promise<Category[]> {
  return categoryRepository.getAll();
}
