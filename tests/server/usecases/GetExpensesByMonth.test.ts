import { describe, it, expect } from 'vitest';
import { getExpensesByMonth } from '../../../server/src/usecases/expenses';
import { Expense } from '../../../server/src/domain/expense';
import { DateTime } from '../../../server/src/domain/dateTime';

function makeExpense(dateISO: string, id = 'x'): Expense {
  return new Expense(id, DateTime.fromISO(dateISO), 'X', 100, 1, 'ARS', '', 'expense', false, '');
}

const expenses: Expense[] = [
  makeExpense('2024-06-01', 'a'),
  makeExpense('2024-06-15', 'b'),
  makeExpense('2024-06-30', 'c'),
  makeExpense('2024-07-01', 'd'),
  makeExpense('2023-06-01', 'e'),
];

describe('getExpensesByMonth', () => {
  it('returns only expenses from the given month and year', () => {
    const result = getExpensesByMonth(expenses, 2024, 6);
    expect(result.map(e => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('excludes a different month in the same year', () => {
    const result = getExpensesByMonth(expenses, 2024, 7);
    expect(result.map(e => e.id)).toEqual(['d']);
  });

  it('excludes a different year with the same month', () => {
    const result = getExpensesByMonth(expenses, 2023, 6);
    expect(result.map(e => e.id)).toEqual(['e']);
  });

  it('returns empty array when no match', () => {
    expect(getExpensesByMonth(expenses, 2099, 1)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(getExpensesByMonth([], 2024, 6)).toEqual([]);
  });
});
