import { describe, it, expect } from 'vitest';
import {
  rowToSummaryMonth,
  rowToCategorySummary,
} from '../../../server/src/mappers/sheetMapper';

// ---------------------------------------------------------------------------
// Summary month mapping
// New column layout (28 cols, A:AB):
//   0=year, 1=monthLabel
//   2=ind.userA, 3=ind.userB
//   4=shared.userA, 5=shared.userB, 6=shared.total
//   7=shared%.userA, 8=shared%.userB
//   9=total.userA, 10=total.userB
//   11=indInc.userA, 12=indInc.userB
//   13=sharedInc.userA, 14=sharedInc.userB
//   15=inc%.userA, 16=inc%.userB
//   17=sharedIncTotal
//   18=totalInc.userA, 19=totalInc.userB
//   20=savings.userA, 21=savings.userB
//   22=householdSavings
//   23=savings%.userA, 24=savings%.userB
//   25=householdSavings%
//   26=saldo.aToB, 27=saldo.bToA
// ---------------------------------------------------------------------------
describe('rowToSummaryMonth', () => {
  it('parses year and label', () => {
    const row = new Array(28).fill('');
    row[0] = '2024';
    row[1] = '  June2024  ';
    const summary = rowToSummaryMonth(row);
    expect(summary.year).toBe(2024);
    expect(summary.monthLabel).toBe('June2024');
  });

  it('parses individual expenses', () => {
    const row = new Array(28).fill('');
    row[2] = '$1,000'; row[3] = '$2,000';
    const summary = rowToSummaryMonth(row);
    expect(summary.individualExpenses).toEqual({ userA: 1000, userB: 2000 });
  });

  it('parses shared expenses', () => {
    const row = new Array(28).fill('');
    row[4] = '$500'; row[5] = '$600'; row[6] = '$1,100';
    row[7] = '45%';  row[8] = '55%';
    const summary = rowToSummaryMonth(row);
    expect(summary.sharedExpenses).toEqual({ userA: 500, userB: 600, total: 1100 });
    expect(summary.sharedExpensesPercent).toEqual({ userA: 45, userB: 55 });
  });

  it('parses total expenses', () => {
    const row = new Array(28).fill('');
    row[9] = '$1,500'; row[10] = '$2,600';
    const summary = rowToSummaryMonth(row);
    expect(summary.totalExpenses).toEqual({ userA: 1500, userB: 2600 });
  });

  it('parses income fields', () => {
    const row = new Array(28).fill('');
    row[11] = '$3,000'; row[12] = '$0';          // individualIncome
    row[13] = '$500';   row[14] = '$4,000';       // sharedIncome
    row[15] = '11%';    row[16] = '89%';          // incomePercent
    row[17] = '$4,500';                           // sharedIncomeTotal
    row[18] = '$3,500'; row[19] = '$4,000';       // totalIncome
    const summary = rowToSummaryMonth(row);
    expect(summary.individualIncome).toEqual({ userA: 3000, userB: 0 });
    expect(summary.sharedIncome).toEqual({ userA: 500, userB: 4000 });
    expect(summary.incomePercent).toEqual({ userA: 11, userB: 89 });
    expect(summary.sharedIncomeTotal).toBe(4500);
    expect(summary.totalIncome).toEqual({ userA: 3500, userB: 4000 });
  });

  it('parses savings fields', () => {
    const row = new Array(28).fill('');
    row[20] = '$3,000'; row[21] = '$4,000';  // savings
    row[22] = '$7,000';                      // householdSavings
    row[23] = '25%';    row[24] = '33%';     // savingsPercent
    row[25] = '29%';                         // householdSavingsPercent
    const summary = rowToSummaryMonth(row);
    expect(summary.savings).toEqual({ userA: 3000, userB: 4000 });
    expect(summary.householdSavings).toBe(7000);
    expect(summary.savingsPercent).toEqual({ userA: 25, userB: 33 });
    expect(summary.householdSavingsPercent).toBe(29);
  });

  it('parses saldo', () => {
    const row = new Array(28).fill('');
    row[26] = '$150'; row[27] = '$0';
    const summary = rowToSummaryMonth(row);
    expect(summary.saldo).toEqual({ aToB: 150, bToA: 0 });
  });

  it('returns zeros for empty row', () => {
    const row = new Array(28).fill('');
    const summary = rowToSummaryMonth(row);
    expect(summary.year).toBe(0);
    expect(summary.individualExpenses).toEqual({ userA: 0, userB: 0 });
    expect(summary.saldo).toEqual({ aToB: 0, bToA: 0 });
  });
});

// ---------------------------------------------------------------------------
// Category summary mapping (summary_by_categories)
// ---------------------------------------------------------------------------
describe('rowToCategorySummary', () => {
  it('maps ingreso row correctly', () => {
    const row = ['Sueldo', 'Ingreso', 'user-a', 'No', '2024-06', '$5,000'];
    const result = rowToCategorySummary(row);
    expect(result).toMatchObject({
      category: 'Sueldo',
      type: 'income',
      user: 'user-a',
      shared: false,
      period: { year: 2024, month: 6 },
      amount: 5000,
    });
  });

  it('maps gasto row correctly', () => {
    const row = ['Supermercado', 'Gasto', 'user-b', 'Si', '2025-01', '$1,234.56'];
    const result = rowToCategorySummary(row);
    expect(result).toMatchObject({
      category: 'Supermercado',
      type: 'expense',
      user: 'user-b',
      shared: true,
      period: { year: 2025, month: 1 },
      amount: 1234.56,
    });
  });

  it('is case-insensitive for type and shared', () => {
    const row = ['X', 'INGRESO', 'u', 'SI', '2024-01', '100'];
    const result = rowToCategorySummary(row);
    expect(result.type).toBe('income');
    expect(result.shared).toBe(true);
  });

  it('trims whitespace from fields', () => {
    const row = ['  Comida  ', '  Gasto  ', '  user-a  ', '  No  ', '2024-06', '100'];
    const result = rowToCategorySummary(row);
    expect(result.category).toBe('Comida');
    expect(result.user).toBe('user-a');
  });
});
