import { expenseRepository } from '../repositories';
import type { Expense } from '../domain/expense';

export async function getAllExpenses(): Promise<Expense[]> {
  return expenseRepository.getAll();
}

export function getExpensesByMonth(expenses: Expense[], year: number, month: number): Expense[] {
  return expenses.filter(expense => expense.date.year === year && expense.date.month === month);
}

export type SearchScope = 'last3m' | 'all';

const SEARCH_CACHE_TTL_MS = 30_000;
let searchCache: { at: number; expenses: Expense[] } | null = null;

async function getAllCachedForSearch(): Promise<Expense[]> {
  const now = globalThis.Date.now();
  if (searchCache && now - searchCache.at < SEARCH_CACHE_TTL_MS) return searchCache.expenses;
  const expenses = await expenseRepository.getAll();
  searchCache = { at: now, expenses };
  return expenses;
}

export async function searchExpenses(
  query: string,
  scope: SearchScope,
  category: string | null,
): Promise<Expense[]> {
  const normalised = query.trim().toLowerCase();
  const hasQuery = normalised.length >= 3;
  const hasCategory = category != null && category.length > 0;
  if (!hasQuery && !hasCategory) return [];

  const all = await getAllCachedForSearch();

  let result = all;
  if (scope === 'last3m') {
    const cutoff = new globalThis.Date();
    cutoff.setDate(cutoff.getDate() - 90);
    cutoff.setHours(0, 0, 0, 0);
    const cutoffMs = cutoff.getTime();
    result = result.filter(e => {
      const ms = new globalThis.Date(e.date.toISO()).getTime();
      return ms >= cutoffMs;
    });
  }

  if (hasCategory) {
    result = result.filter(e => e.category === category);
  }

  if (hasQuery) {
    result = result.filter(e =>
      e.notes != null && e.notes.toLowerCase().includes(normalised)
    );
  }

  return result;
}

export async function createExpense(data: Omit<Expense, 'id'> & { id?: string }): Promise<Expense> {
  return expenseRepository.create(data);
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | null> {
  return expenseRepository.update(id, updates);
}

export async function deleteExpense(id: string): Promise<boolean> {
  return expenseRepository.delete(id);
}
