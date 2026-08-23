import { describe, it, expect } from 'vitest';
import {
  sheetDateToISO,
  isoToSheetDate,
  parseSheetCurrency,
  parseSheetPercent,
  rowToExpense,
  expenseToRow,
  rowToCategory,
  isBlankRow,
} from '../../../server/src/mappers/sheetMapper';
import { Expense } from '../../../server/src/domain/expense';
import { DateTime } from '../../../server/src/domain/dateTime';

// ---------------------------------------------------------------------------
// Date conversions
// ---------------------------------------------------------------------------
describe('sheetDateToISO', () => {
  it('passes through ISO dates (YYYY-MM-DD)', () => {
    expect(sheetDateToISO('2024-06-15')).toBe('2024-06-15');
  });

  it('truncates ISO datetime to date-only', () => {
    expect(sheetDateToISO('2024-06-15 14:30')).toBe('2024-06-15');
  });

  it('converts M/D/YYYY H:MM:SS to YYYY-MM-DD (expenses format)', () => {
    expect(sheetDateToISO('6/20/2024 0:00:00')).toBe('2024-06-20');
  });

  it('zero-pads single-digit month and day in M/D/YYYY H:MM:SS', () => {
    expect(sheetDateToISO('1/5/2024 0:00:00')).toBe('2024-01-05');
  });

  it('converts DD/MM/YYYY to YYYY-MM-DD (habits format)', () => {
    expect(sheetDateToISO('15/06/2024')).toBe('2024-06-15');
  });

  it('zero-pads single-digit day and month in DD/MM/YYYY', () => {
    expect(sheetDateToISO('1/3/2024')).toBe('2024-03-01');
  });

  it('returns empty string for empty input', () => {
    expect(sheetDateToISO('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(sheetDateToISO('  2024-06-15  ')).toBe('2024-06-15');
  });

  it('handles undefined-ish input via fallback', () => {
    expect(sheetDateToISO(undefined as unknown as string)).toBe('');
  });
});

describe('isoToSheetDate', () => {
  it('is a pass-through', () => {
    expect(isoToSheetDate('2024-06-15')).toBe('2024-06-15');
  });
});

// ---------------------------------------------------------------------------
// Currency / percent parsers
// ---------------------------------------------------------------------------
describe('parseSheetCurrency', () => {
  it('parses plain number', () => {
    expect(parseSheetCurrency('1000')).toBe(1000);
  });

  it('strips $ and commas', () => {
    expect(parseSheetCurrency('$1,234.56')).toBe(1234.56);
  });

  it('returns 0 for undefined', () => {
    expect(parseSheetCurrency(undefined)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseSheetCurrency('')).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parseSheetCurrency('abc')).toBe(0);
  });

  it('handles negative values', () => {
    expect(parseSheetCurrency('-500')).toBe(-500);
  });
});

describe('parseSheetPercent', () => {
  it('strips % and parses', () => {
    expect(parseSheetPercent('95.5%')).toBe(95.5);
  });

  it('parses plain number', () => {
    expect(parseSheetPercent('100')).toBe(100);
  });

  it('returns 0 for undefined', () => {
    expect(parseSheetPercent(undefined)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseSheetPercent('')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Expense mapping
// ---------------------------------------------------------------------------
describe('rowToExpense', () => {
  // Date comes from Sheets as M/D/YYYY H:MM:SS (US format with time component)
  const row = ['exp-1', '6/15/2024 0:00:00', 'food', '$1,200.50', '3', 'USD', 'groceries', 'Ingreso', 'Si', 'userA'];

  it('maps all fields correctly', () => {
    const expense = rowToExpense(row);
    expect(expense.id).toBe('exp-1');
    expect(expense.date).toBeInstanceOf(DateTime);
    expect(expense.date.toISO()).toBe('2024-06-15');
    expect(expense.date.hour).toBe(0);
    expect(expense.category).toBe('food');
    expect(expense.amount).toBe(1200.50);
    expect(expense.installments).toBe(3);
    expect(expense.currency).toBe('USD');
    expect(expense.notes).toBe('groceries');
    expect(expense.type).toBe('income');
    expect(expense.shared).toBe(true);
    expect(expense.user).toBe('userA');
  });

  it('defaults type to expense for Egreso', () => {
    const r = [...row];
    r[7] = 'Egreso';
    expect(rowToExpense(r).type).toBe('expense');
  });

  it('defaults shared to false for No', () => {
    const r = [...row];
    r[8] = 'No';
    expect(rowToExpense(r).shared).toBe(false);
  });

  it('defaults installments to 1 when missing', () => {
    const r = [...row];
    r[4] = '';
    expect(rowToExpense(r).installments).toBe(1);
  });

  it('defaults currency to ARS when missing', () => {
    const r = [...row];
    r[5] = '';
    expect(rowToExpense(r).currency).toBe('ARS');
  });
});

describe('expenseToRow', () => {
  it('converts expense to sheet row', () => {
    const expense = new Expense(
      'exp-1', DateTime.fromISO('2024-06-15'), 'food', 1200.50, 3, 'USD', 'groceries', 'income', true, 'userA',
    );

    const row = expenseToRow(expense);
    expect(row).toEqual([
      'exp-1', '2024-06-15', 'food', '1200.5', '3', 'USD', 'groceries', 'Ingreso', 'Si', 'userA',
    ]);
  });

  it('maps expense type back to Egreso', () => {
    const expense = new Expense('x', DateTime.fromISO(''), '', 0, 1, 'ARS', '', 'expense', false, '');
    expect(expenseToRow(expense)[7]).toBe('Egreso');
  });
});

describe('expense round-trip', () => {
  it('rowToExpense → expenseToRow preserves date', () => {
    const row = ['rt-1', '2024-01-31', 'transport', '500', '1', 'ARS', 'taxi', 'Egreso', 'No', 'userB'];
    const expense = rowToExpense(row);
    const restored = rowToExpense(expenseToRow(expense));
    expect(restored.date.toISO()).toBe(expense.date.toISO());
    expect(restored.category).toBe(expense.category);
    expect(restored.amount).toBe(expense.amount);
  });
});

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------
describe('rowToCategory', () => {
  it('maps fields correctly', () => {
    const row = ['cat-1', 'Comida', '🍔', 'Egreso', 'shared'];
    expect(rowToCategory(row)).toEqual({
      id: 'cat-1',
      name: 'Comida',
      emoji: '🍔',
      type: 'expense',
      user: 'shared',
    });
  });

  it('parses Ingreso as income', () => {
    const row = ['cat-2', 'Sueldo', '💰', 'Ingreso', 'userA'];
    expect(rowToCategory(row).type).toBe('income');
  });

  it('normalises user to lowercase trimmed', () => {
    const row = ['cat-3', 'X', '', 'Egreso', '  UserB  '];
    expect(rowToCategory(row).user).toBe('userb');
  });

  it('defaults user to shared when missing', () => {
    const row = ['cat-4', 'Y', '', 'Egreso'];
    expect(rowToCategory(row).user).toBe('shared');
  });
});

// ---------------------------------------------------------------------------
// Blank-row detection
//
// Sheets (and .xlsx exports) routinely declare a range far larger than the rows
// actually filled in — a categories tab sized A1:E1000 holding 19 real rows is normal.
// Without this guard every trailing empty row became a blank entity (e.g. ~980 empty
// categories rendering as broken icons in the add-expense form).
// ---------------------------------------------------------------------------
describe('isBlankRow', () => {
  it('treats an all-empty row as blank', () => {
    expect(isBlankRow(['', '', '', '', ''])).toBe(true);
  });

  it('treats a whitespace-only row as blank', () => {
    expect(isBlankRow(['  ', '	', ' '])).toBe(true);
  });

  it('treats an empty array as blank', () => {
    expect(isBlankRow([])).toBe(true);
  });

  it('does not treat a row with any content as blank', () => {
    expect(isBlankRow(['', '', 'super', '', ''])).toBe(false);
  });

  it('does not treat a row with a zero amount as blank', () => {
    expect(isBlankRow(['id-1', '', '0'])).toBe(false);
  });

  it('handles undefined/null cells without throwing', () => {
    expect(isBlankRow([undefined as unknown as string, null as unknown as string])).toBe(true);
  });
});
