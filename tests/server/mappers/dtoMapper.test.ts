import { describe, it, expect } from 'vitest';
import { sortExpensesByDate, pagedExpensesResponse } from '../../../server/src/mappers/dtoMapper';
import { Expense } from '../../../server/src/domain/expense';
import { DateTime } from '../../../server/src/domain/dateTime';

function makeExpense(dateISO: string): Expense {
  return new Expense(dateISO, DateTime.fromISO(dateISO), 'food', 10, 1, 'ARS', '', 'expense', false, 'alice');
}

// ---------------------------------------------------------------------------
// sortExpensesByDate
// ---------------------------------------------------------------------------
describe('sortExpensesByDate', () => {
  it('sorts by ISO date descending (most recent first)', () => {
    const expenses = [
      makeExpense('2024-03-01'),
      makeExpense('2024-01-15'),
      makeExpense('2024-06-20'),
    ];
    const result = sortExpensesByDate(expenses);
    expect(result.map(e => e.date.toISO())).toEqual(['2024-06-20', '2024-03-01', '2024-01-15']);
  });

  it('does not mutate the input array', () => {
    const expenses = [makeExpense('2024-02-01'), makeExpense('2024-01-01')];
    const original = [...expenses];
    sortExpensesByDate(expenses);
    expect(expenses.map(e => e.date.toISO())).toEqual(original.map(e => e.date.toISO()));
  });

  it('returns empty array for empty input', () => {
    expect(sortExpensesByDate([])).toEqual([]);
  });

  it('handles same-date entries stably', () => {
    const a = makeExpense('2024-05-10');
    const b = new Expense('b', DateTime.fromISO('2024-05-10'), 'food', 10, 1, 'ARS', '', 'expense', false, 'alice');
    const result = sortExpensesByDate([a, b]);
    expect(result).toHaveLength(2);
    expect(result[0].date.toISO()).toBe('2024-05-10');
  });
});

// ---------------------------------------------------------------------------
// pagedExpensesResponse
// ---------------------------------------------------------------------------
describe('pagedExpensesResponse', () => {
  const expenses = [
    makeExpense('2024-01-01'),
    makeExpense('2024-05-10'),
    makeExpense('2024-03-20'),
    makeExpense('2024-07-04'),
    makeExpense('2024-02-14'),
  ];

  it('returns all expenses sorted when no limit is given', () => {
    const result = pagedExpensesResponse(expenses);
    expect(result.total).toBe(5);
    expect(result.hasMore).toBe(false);
    expect(result.expenses.map(e => e.date)).toEqual([
      '2024-07-04',
      '2024-05-10',
      '2024-03-20',
      '2024-02-14',
      '2024-01-01',
    ]);
  });

  it('returns first page when limit is given', () => {
    const result = pagedExpensesResponse(expenses, 2);
    expect(result.expenses).toHaveLength(2);
    expect(result.expenses[0].date).toBe('2024-07-04');
    expect(result.total).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it('returns last page with hasMore=false', () => {
    const result = pagedExpensesResponse(expenses, 2, 4);
    expect(result.expenses).toHaveLength(1);
    expect(result.hasMore).toBe(false);
  });

  it('returns correct slice at offset', () => {
    const result = pagedExpensesResponse(expenses, 2, 2);
    expect(result.expenses.map(e => e.date)).toEqual(['2024-03-20', '2024-02-14']);
    expect(result.hasMore).toBe(true);
  });

  it('returns empty result when offset is beyond total', () => {
    const result = pagedExpensesResponse(expenses, 2, 10);
    expect(result.expenses).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});
