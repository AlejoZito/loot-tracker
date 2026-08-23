import { describe, it, expect } from 'vitest';
import { CategoryTransaction } from '../../../server/src/domain/categoryTransaction';
import { rowToCategorySummary } from '../../../server/src/mappers/sheetMapper';

describe('CategoryTransaction', () => {
  it('can be constructed with all fields', () => {
    const ct = new CategoryTransaction('Sueldo', 'income', 'userA', false, { year: 2024, month: 6 }, 5000);
    expect(ct.category).toBe('Sueldo');
    expect(ct.type).toBe('income');
    expect(ct.user).toBe('userA');
    expect(ct.shared).toBe(false);
    expect(ct.period).toMatchObject({ year: 2024, month: 6 });
    expect(ct.amount).toBe(5000);
  });

  it('isIncome() returns true for income type', () => {
    const ct = new CategoryTransaction('X', 'income', 'userA', false, { year: 2024, month: 1 }, 100);
    expect(ct.isIncome()).toBe(true);
    expect(ct.isExpense()).toBe(false);
  });

  it('isExpense() returns true for expense type', () => {
    const ct = new CategoryTransaction('X', 'expense', 'userB', true, { year: 2024, month: 1 }, 100);
    expect(ct.isExpense()).toBe(true);
    expect(ct.isIncome()).toBe(false);
  });

  it('isShared() returns the shared flag', () => {
    const shared = new CategoryTransaction('X', 'expense', 'userA', true, { year: 2024, month: 1 }, 100);
    const personal = new CategoryTransaction('X', 'expense', 'userA', false, { year: 2024, month: 1 }, 100);
    expect(shared.isShared()).toBe(true);
    expect(personal.isShared()).toBe(false);
  });
});

describe('rowToCategorySummary returns CategoryTransaction', () => {
  it('maps ingreso row to CategoryTransaction', () => {
    const row = ['Sueldo', 'Ingreso', 'user-a', 'No', '2024-06', '$5,000'];
    const result = rowToCategorySummary(row);
    expect(result).toBeInstanceOf(CategoryTransaction);
    expect(result.category).toBe('Sueldo');
    expect(result.type).toBe('income');
    expect(result.user).toBe('user-a');
    expect(result.shared).toBe(false);
    expect(result.period).toMatchObject({ year: 2024, month: 6 });
    expect(result.amount).toBe(5000);
  });

  it('maps gasto compartido row to CategoryTransaction', () => {
    const row = ['Supermercado', 'Gasto', 'userB', 'Si', '2025-01', '$1,234.56'];
    const result = rowToCategorySummary(row);
    expect(result).toBeInstanceOf(CategoryTransaction);
    expect(result.type).toBe('expense');
    expect(result.shared).toBe(true);
    expect(result.amount).toBe(1234.56);
  });
});
