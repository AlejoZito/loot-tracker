import { Expense } from '../domain/expense';
import type { Currency, TransactionType } from '../domain/expense';
import { Category } from '../domain/category';
import type { CategoryType } from '../domain/category';
import { Habit, HabitCategory } from '../domain/habit';
import { Date as DomainDate } from '../domain/date';
import { DateTime } from '../domain/dateTime';
import { InstallmentExpense } from '../domain/installmentExpense';
import { MonthlySummary } from '../domain/monthlySummary';
import { CategoryTransaction } from '../domain/categoryTransaction';
import { Period } from '../domain/period';

/**
 * Row -> domain mappers for the `db` datasource.
 *
 * Money arrives as a JSON number because the views cast it to `double precision` and
 * `EXPENSE_COLUMNS` casts `expenses.amount`. PostgREST would otherwise serialise
 * `numeric` as a string, which concatenates instead of summing.
 */

/** Columns to read `expenses` with. The cast is what keeps `amount` a number. */
export const EXPENSE_COLUMNS =
  'id,occurred_at,category,amount:amount::float8,installments,currency,notes,type,shared,user_id';

function num(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Parse 'YYYY-MM-DD' (a Postgres `date`) into the domain Date. */
function toDomainDate(v: string | null | undefined): DomainDate {
  return DomainDate.fromISO((v || '').slice(0, 10));
}

/**
 * Parse a Postgres `timestamp` (no zone) such as '2024-06-20T14:30:00' into DateTime.
 * Must not round-trip through Date(): that applies the host timezone and can shift the
 * calendar day, moving an expense into the wrong month.
 */
function toDateTime(v: string | null | undefined): DateTime {
  const s = (v || '').trim();
  if (!s) return new DateTime(0, 0, 0);
  const [datePart, timePartRaw] = s.split(/[T ]/);
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, min, sec] = (timePartRaw || '').split(':').map(v => parseInt(v, 10));
  return new DateTime(y || 0, m || 0, d || 0, h || 0, min || 0, sec || 0);
}

/** Serialise a DateTime back to the wall-clock format Postgres accepts for `timestamp`. */
export function dateTimeToDb(dt: DateTime): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.year}-${p(dt.month)}-${p(dt.day)}T${p(dt.hour)}:${p(dt.minute)}:${p(dt.second)}`;
}

// ─────────────────────────── row shapes ───────────────────────────

export interface ExpenseRow {
  id: string;
  occurred_at: string;
  category: string;
  amount: number;
  installments: number;
  currency: string;
  notes: string | null;
  type: string;
  shared: boolean;
  user_id: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  emoji: string | null;
  type: string;
  user_id: string | null;
}

export interface HabitCategoryRow {
  id: string;
  name: string;
  emoji: string | null;
  default_value: boolean;
}

export interface HabitRow {
  day: string;
  category_id: string;
  user_id: string;
  value: boolean;
}

/** A row of `expenses_by_installments`: only what is specific to one installment. */
export interface InstallmentRow {
  expense_id: string;
  installment_number: number;
  installment_amount: number;
  origin_month: string;
  period_month: string;
  period_key: string;
  period_date: string;
}

export interface SummaryRow {
  year: number;
  month_label: string;
  individual_expenses_a: number;
  individual_expenses_b: number;
  shared_expenses_a: number;
  shared_expenses_b: number;
  shared_expenses_total: number;
  shared_expenses_pct_a: number;
  shared_expenses_pct_b: number;
  total_expenses_a: number;
  total_expenses_b: number;
  individual_income_a: number;
  individual_income_b: number;
  shared_income_a: number;
  shared_income_b: number;
  income_pct_a: number;
  income_pct_b: number;
  shared_income_total: number;
  total_income_a: number;
  total_income_b: number;
  savings_a: number;
  savings_b: number;
  household_savings: number;
  savings_pct_a: number;
  savings_pct_b: number;
  household_savings_pct: number;
  settlement_a_to_b: number;
  settlement_b_to_a: number;
}

export interface SummaryByCategoryRow {
  category: string;
  type: string;
  user_id: string;
  shared: boolean;
  period: string;
  amount: number;
}

// ─────────────────────────── mappers ───────────────────────────

export function rowToExpense(row: ExpenseRow): Expense {
  return new Expense(
    row.id,
    toDateTime(row.occurred_at),
    row.category,
    num(row.amount),
    row.installments || 1,
    row.currency as Currency,
    row.notes || '',
    row.type as TransactionType,
    !!row.shared,
    row.user_id || '',
  );
}

export function expenseToRow(e: Expense): Omit<ExpenseRow, 'id'> & { id?: string } {
  return {
    id: e.id || undefined,
    occurred_at: dateTimeToDb(e.date),
    category: e.category,
    amount: e.amount,
    installments: e.installments || 1,
    currency: e.currency,
    notes: e.notes || '',
    type: e.type,
    shared: !!e.shared,
    user_id: e.user || '',
  };
}

export function rowToCategory(row: CategoryRow): Category {
  return new Category(
    row.id,
    row.name,
    row.emoji || '',
    row.type as CategoryType,
    (row.user_id || 'shared').toLowerCase().trim(),
  );
}

export function rowToHabitCategory(row: HabitCategoryRow): HabitCategory {
  return new HabitCategory(row.id, row.name, row.emoji || '', !!row.default_value);
}

export function rowToHabit(row: HabitRow): Habit {
  return new Habit(toDomainDate(row.day), row.category_id, !!row.value, row.user_id || '');
}

/** The installment row carries no expense attributes, so its parent supplies them. */
export function rowToInstallmentExpense(row: InstallmentRow, expense: Expense): InstallmentExpense {
  return new InstallmentExpense(
    row.expense_id,
    toDomainDate(row.period_date),
    toDomainDate(row.origin_month),
    expense.category,
    num(row.installment_amount),
    expense.installments || 1,
    row.installment_number || 1,
    expense.currency,
    expense.notes,
    expense.type,
    expense.shared,
    expense.user || '',
  );
}

export function rowToCategoryTransaction(row: SummaryByCategoryRow): CategoryTransaction {
  return new CategoryTransaction(
    row.category,
    row.type as TransactionType,
    (row.user_id || '').toLowerCase().trim(),
    !!row.shared,
    Period.fromYYYYMM(row.period),
    num(row.amount),
  );
}

/**
 * The view returns percentages as fractions (0.44); the DTO carries whole numbers (44),
 * as the sheet datasources produce. Removing the scaling breaks parity between them.
 */
export function rowToMonthlySummary(row: SummaryRow): MonthlySummary {
  const pct = (v: number) => num(v) * 100;
  return new MonthlySummary(
    row.year,
    row.month_label,
    { userA: num(row.individual_expenses_a), userB: num(row.individual_expenses_b) },
    { userA: num(row.shared_expenses_a), userB: num(row.shared_expenses_b), total: num(row.shared_expenses_total) },
    { userA: pct(row.shared_expenses_pct_a), userB: pct(row.shared_expenses_pct_b) },
    { userA: num(row.total_expenses_a), userB: num(row.total_expenses_b) },
    { userA: num(row.individual_income_a), userB: num(row.individual_income_b) },
    { userA: num(row.shared_income_a), userB: num(row.shared_income_b) },
    { userA: pct(row.income_pct_a), userB: pct(row.income_pct_b) },
    num(row.shared_income_total),
    { userA: num(row.total_income_a), userB: num(row.total_income_b) },
    { userA: num(row.savings_a), userB: num(row.savings_b) },
    num(row.household_savings),
    { userA: pct(row.savings_pct_a), userB: pct(row.savings_pct_b) },
    pct(row.household_savings_pct),
    { aToB: num(row.settlement_a_to_b), bToA: num(row.settlement_b_to_a) },
  );
}
