import { describe, it, expect } from 'vitest';
import {
  rowToExpense,
  expenseToRow,
  rowToCategory,
  rowToHabit,
  rowToHabitCategory,
  rowToInstallmentExpense,
  rowToCategoryTransaction,
  rowToMonthlySummary,
  dateTimeToDb,
  type ExpenseRow,
  type InstallmentRow,
  type SummaryRow,
  type SummaryByCategoryRow,
} from '../../../server/src/mappers/dbMapper';
import { Expense } from '../../../server/src/domain/expense';
import { DateTime } from '../../../server/src/domain/dateTime';

const expenseRow: ExpenseRow = {
  id: 'exp-1',
  occurred_at: '2024-06-20T14:30:00',
  category: 'Supermercado',
  amount: '15000.00',          // PostgREST serialises numeric as a string
  installments: 1,
  currency: 'ARS',
  notes: 'weekly shop',
  type: 'expense',
  shared: true,
  user_id: 'user-a',
};

describe('dbMapper', () => {
  describe('numeric parsing', () => {
    it('parses numeric columns that arrive as strings', () => {
      // Unparsed, these concatenate instead of summing in every downstream total.
      const e = rowToExpense(expenseRow);
      expect(e.amount).toBe(15000);
      expect(typeof e.amount).toBe('number');
    });

    it('treats null amounts as 0 rather than NaN', () => {
      const e = rowToExpense({ ...expenseRow, amount: null as unknown as string });
      expect(e.amount).toBe(0);
    });
  });

  describe('timestamp handling', () => {
    it('reads a wall-clock timestamp without applying a timezone', () => {
      const e = rowToExpense(expenseRow);
      expect(e.date.toISO()).toBe('2024-06-20');
      expect(e.date.hour).toBe(14);
      expect(e.date.minute).toBe(30);
    });

    it('keeps a late-evening expense in its own calendar month', () => {
      // A Date() round-trip on a zone-less timestamp shifts this into July, putting the
      // row in the wrong monthly summary.
      const e = rowToExpense({ ...expenseRow, occurred_at: '2024-06-30T22:00:00' });
      expect(e.date.toISO()).toBe('2024-06-30');
    });

    it('accepts a space separator as well as T', () => {
      const e = rowToExpense({ ...expenseRow, occurred_at: '2024-06-20 14:30:00' });
      expect(e.date.toISO()).toBe('2024-06-20');
      expect(e.date.hour).toBe(14);
    });

    it('round-trips through dateTimeToDb', () => {
      const dt = new DateTime(2024, 6, 20, 14, 30, 5);
      expect(dateTimeToDb(dt)).toBe('2024-06-20T14:30:05');
      expect(rowToExpense({ ...expenseRow, occurred_at: dateTimeToDb(dt) }).date.equals(dt)).toBe(true);
    });

    it('pads single-digit components when writing', () => {
      expect(dateTimeToDb(new DateTime(2024, 1, 5, 9, 8, 7))).toBe('2024-01-05T09:08:07');
    });
  });

  describe('rowToExpense', () => {
    it('maps every field', () => {
      const e = rowToExpense(expenseRow);
      expect(e.id).toBe('exp-1');
      expect(e.category).toBe('Supermercado');
      expect(e.currency).toBe('ARS');
      expect(e.notes).toBe('weekly shop');
      expect(e.type).toBe('expense');
      expect(e.shared).toBe(true);
      expect(e.user).toBe('user-a');
    });

    it('defaults a null notes column to an empty string', () => {
      expect(rowToExpense({ ...expenseRow, notes: null }).notes).toBe('');
    });

    it('defaults installments to 1 when absent', () => {
      expect(rowToExpense({ ...expenseRow, installments: 0 }).installments).toBe(1);
    });
  });

  describe('expenseToRow', () => {
    it('maps the domain user field onto user_id', () => {
      const e = new Expense(
        'exp-9', DateTime.fromISO('2024-06-20'), 'Transporte', 3000, 1,
        'ARS', 'bus', 'expense', false, 'user-b',
      );
      const row = expenseToRow(e);
      expect(row.user_id).toBe('user-b');
      expect(row.occurred_at).toBe('2024-06-20T00:00:00');
      expect(row.amount).toBe(3000);
      expect(row.shared).toBe(false);
    });
  });

  describe('rowToCategory', () => {
    it('lowercases the user and defaults a null user to shared', () => {
      expect(rowToCategory({ id: 'g', name: 'Super', emoji: '🛒', type: 'expense', user_id: null }).user).toBe('shared');
      expect(rowToCategory({ id: 'g', name: 'Super', emoji: '🛒', type: 'expense', user_id: 'User-A' }).user).toBe('user-a');
    });
  });

  describe('habits', () => {
    it('maps a habit row into the long-format domain object', () => {
      const h = rowToHabit({ day: '2024-06-15', category_id: 'gym', user_id: 'user-a', value: true });
      expect(h.day.toISO()).toBe('2024-06-15');
      expect(h.categoryId).toBe('gym');
      expect(h.value).toBe(true);
    });

    it('maps a habit category', () => {
      const c = rowToHabitCategory({ id: 'gym', name: 'Gimnasio', emoji: '🏋️', default_value: false });
      expect(c.defaultValue).toBe(false);
      expect(c.name).toBe('Gimnasio');
    });
  });

  describe('rowToInstallmentExpense', () => {
    const row: InstallmentRow = {
      expense_id: 'exp-1',
      category: 'Supermercado',
      installments: 3,
      installment_number: 2,
      notes: null,
      type: 'expense',
      shared: false,
      user_id: 'user-a',
      period_date: '2024-07-20',
      origin_month: '2024-06-01',
      amount_local: '5000.00',
      currency_local: 'ARS',
      amount_at_period: '3.8461',
      amount_at_origin: '3.6496',
    };

    it('maps the local amount and both converted amounts', () => {
      const i = rowToInstallmentExpense(row);
      expect(i.installmentAmount).toBe(5000);
      expect(i.currency).toBe('ARS');
      expect(i.usdCurrentMonth).toBeCloseTo(3.8461, 4);
      expect(i.usdOrigin).toBeCloseTo(3.6496, 4);
    });

    it('keeps the installment and origin periods distinct', () => {
      const i = rowToInstallmentExpense(row);
      expect(i.period.toISO()).toBe('2024-07-20');
      expect(i.originPeriod.toISO()).toBe('2024-06-01');
    });
  });

  describe('rowToCategoryTransaction', () => {
    const row: SummaryByCategoryRow = {
      category: 'Supermercado',
      type: 'expense',
      user_id: 'User-A',
      shared: true,
      period: '2024-06',
      amount: '231.5',
    };

    it('maps the period into the Period value object', () => {
      const t = rowToCategoryTransaction(row);
      expect(t.period.toYYYYMM()).toBe('2024-06');
      expect(t.amount).toBe(231.5);
      expect(t.user).toBe('user-a');
      expect(t.isExpense()).toBe(true);
      expect(t.isShared()).toBe(true);
    });
  });

  describe('rowToMonthlySummary', () => {
    // The view emits percentages as fractions (0.4444); the DTO carries whole numbers,
    // as the sheet datasources produce.
    const row: SummaryRow = {
      year: 2024,
      month_label: 'June2024',
      c_indiv_exp_a: '50000', d_indiv_exp_b: '60000',
      e_shared_exp_a: '20000', f_shared_exp_b: '25000',
      g_shared_exp_total: '45000',
      h_shared_pct_a: '0.4444', i_shared_pct_b: '0.5556',
      j_total_exp_a: '70000', k_total_exp_b: '85000',
      l_indiv_inc_a: '360000', m_indiv_inc_b: '260000',
      n_shared_inc_a: '9000', o_shared_inc_b: '21000',
      p_income_pct_a: '0.3', q_income_pct_b: '0.7',
      r_shared_inc_total: '30000',
      s_total_inc_a: '369000', t_total_inc_b: '281000',
      u_savings_a: '105500', v_savings_b: '189500',
      w_household_savings: '-15000',
      x_savings_pct_a: '0.2859', y_savings_pct_b: '0.6744',
      z_household_savings_pct: '-0.5',
      aa_settlement_a_to_b: '0', ab_settlement_b_to_a: '0',
    };

    it('scales fractional percentages to whole numbers', () => {
      const s = rowToMonthlySummary(row);
      expect(s.sharedExpensesPercent.userA).toBeCloseTo(44.44, 2);
      expect(s.incomePercent.userB).toBeCloseTo(70, 6);
      expect(s.householdSavingsPercent).toBeCloseTo(-50, 6);
    });

    it('maps the money columns without scaling them', () => {
      const s = rowToMonthlySummary(row);
      expect(s.individualExpenses.userA).toBe(50000);
      expect(s.sharedExpenses.total).toBe(45000);
      expect(s.totalIncome.userA).toBe(369000);
      expect(s.savings.userB).toBe(189500);
      expect(s.householdSavings).toBe(-15000);
    });

    it('carries the month label and year through', () => {
      const s = rowToMonthlySummary(row);
      expect(s.year).toBe(2024);
      expect(s.monthLabel).toBe('June2024');
    });

    it('reports a zeroed settlement while the feature is disabled', () => {
      const s = rowToMonthlySummary(row);
      expect(s.saldo).toEqual({ aToB: 0, bToA: 0 });
    });
  });
});
