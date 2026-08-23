import type { Expense } from '../domain/expense';

export interface IExpenseRepository {
  getAll(): Promise<Expense[]>;
  create(expense: Omit<Expense, 'id'> & { id?: string }): Promise<Expense>;
  update(id: string, updates: Partial<Expense>): Promise<Expense | null>;
  delete(id: string): Promise<boolean>;
}
