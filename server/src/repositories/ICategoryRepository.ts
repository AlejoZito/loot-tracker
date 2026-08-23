import type { Category } from '../domain/category';

export interface ICategoryRepository {
  getAll(): Promise<Category[]>;
}
