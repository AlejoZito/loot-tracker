import { describe, it, expect } from 'vitest';
import { getCategoryBreakdown } from '../../../server/src/usecases/summary';
import { CategoryTransaction } from '../../../server/src/domain/categoryTransaction';
import { Period } from '../../../server/src/domain/period';

const june2024 = new Period(2024, 6);
const july2024 = new Period(2024, 7);

function makeTransaction(
  category: string,
  type: 'income' | 'expense',
  user: string,
  shared: boolean,
  period: Period,
  amount: number,
): CategoryTransaction {
  return new CategoryTransaction(category, type, user, shared, period, amount);
}

const fixtures: CategoryTransaction[] = [
  makeTransaction('Supermercado', 'expense', 'userA', true,  june2024, 300),
  makeTransaction('Supermercado', 'expense', 'userA', false, june2024, 100),
  makeTransaction('Auto',         'expense', 'userA', true,  june2024, 200),
  makeTransaction('Sueldo',       'income',  'userA', false, june2024, 5000),
  makeTransaction('Supermercado', 'expense', 'userB', true,  june2024, 150), // different user
  makeTransaction('Supermercado', 'expense', 'userA', true,  july2024, 400), // different period
];

describe('getCategoryBreakdown', () => {
  it('keeps each user\'s rows for the same category separate', () => {
    const result = getCategoryBreakdown(fixtures, june2024, 'expense');
    const userARow = result.find(r => r.category === 'Supermercado' && r.user === 'userA')!;
    const userBRow = result.find(r => r.category === 'Supermercado' && r.user === 'userB')!;
    expect(userARow.shared).toBe(300);
    expect(userARow.personal).toBe(100);
    expect(userBRow.shared).toBe(150);
    expect(userBRow.personal).toBe(0);
  });

  it('filters by period', () => {
    const result = getCategoryBreakdown(fixtures, june2024, 'expense');
    // july entry should be excluded
    const sup = result.find(r => r.category === 'Supermercado')!;
    expect(sup.shared).toBe(300); // not 700
  });

  it('filters by type — expense excludes income rows', () => {
    const result = getCategoryBreakdown(fixtures, june2024, 'expense');
    expect(result.find(r => r.category === 'Sueldo')).toBeUndefined();
  });

  it('filters by type — income excludes expense rows', () => {
    const result = getCategoryBreakdown(fixtures, june2024, 'income');
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Sueldo');
    expect(result[0].personal).toBe(5000);
    expect(result[0].shared).toBe(0);
  });

  it('groups same category, sums shared and personal separately', () => {
    const result = getCategoryBreakdown(fixtures, june2024, 'expense');
    const sup = result.find(r => r.category === 'Supermercado')!;
    expect(sup.shared).toBe(300);
    expect(sup.personal).toBe(100);
    expect(sup.total).toBe(400);
  });

  it('total equals shared + personal', () => {
    const result = getCategoryBreakdown(fixtures, june2024, 'expense');
    for (const entry of result) {
      expect(entry.total).toBe(entry.shared + entry.personal);
    }
  });

  it('sorts descending by total', () => {
    const result = getCategoryBreakdown(fixtures, june2024, 'expense');
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].total).toBeGreaterThanOrEqual(result[i].total);
    }
  });

  it('returns empty array when no matches', () => {
    const result = getCategoryBreakdown(fixtures, new Period(2099, 1), 'expense');
    expect(result).toEqual([]);
  });
});
