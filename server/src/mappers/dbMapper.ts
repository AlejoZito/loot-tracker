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
 * PostgREST serialises `numeric` as a JSON *string* to avoid float precision loss, so
 * every money column needs an explicit parse.
 */

/** Parse a PostgREST numeric (string) or number into a number. */
function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
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
  amount: string | number;
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

export interface InstallmentRow {
  expense_id: string;
  category: string;
  installments: number;
  installment_number: number;
  notes: string | null;
  type: string;
  shared: boolean;
  user_id: string;
  period_date: string;
  origin_month: string;
  amount_local: string | number;
  currency_local: string;
  amount_at_period: string | number;
  amount_at_origin: string | number;
}

export interface SummaryRow {
  year: number;
  month_label: string;
  c_indiv_exp_a: string | number;
  d_indiv_exp_b: string | number;
  e_shared_exp_a: string | number;
  f_shared_exp_b: string | number;
  g_shared_exp_total: string | number;
  h_shared_pct_a: string | number;
  i_shared_pct_b: string | number;
  j_total_exp_a: string | number;
  k_total_exp_b: string | number;
  l_indiv_inc_a: string | number;
  m_indiv_inc_b: string | number;
  n_shared_inc_a: string | number;
  o_shared_inc_b: string | number;
  p_income_pct_a: string | number;
  q_income_pct_b: string | number;
  r_shared_inc_total: string | number;
  s_total_inc_a: string | number;
  t_total_inc_b: string | number;
  u_savings_a: string | number;
  v_savings_b: string | number;
  w_household_savings: string | number;
  x_savings_pct_a: string | number;
  y_savings_pct_b: string | number;
  z_household_savings_pct: string | number;
  aa_settlement_a_to_b: string | number;
  ab_settlement_b_to_a: string | number;
}

export interface SummaryByCategoryRow {
  category: string;
  type: string;
  user_id: string;
  shared: boolean;
  period: string;
  amount: string | number;
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

export function rowToInstallmentExpense(row: InstallmentRow): InstallmentExpense {
  return new InstallmentExpense(
    row.expense_id,
    toDomainDate(row.period_date),
    toDomainDate(row.origin_month),
    row.category,
    num(row.amount_local),
    row.installments || 1,
    row.currency_local as Currency,
    row.notes || '',
    row.type as TransactionType,
    !!row.shared,
    row.user_id || '',
    num(row.amount_at_period),
    num(row.amount_at_origin),
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
  const pct = (v: unknown) => num(v) * 100;
  return new MonthlySummary(
    row.year,
    row.month_label,
    { userA: num(row.c_indiv_exp_a), userB: num(row.d_indiv_exp_b) },
    { userA: num(row.e_shared_exp_a), userB: num(row.f_shared_exp_b), total: num(row.g_shared_exp_total) },
    { userA: pct(row.h_shared_pct_a), userB: pct(row.i_shared_pct_b) },
    { userA: num(row.j_total_exp_a), userB: num(row.k_total_exp_b) },
    { userA: num(row.l_indiv_inc_a), userB: num(row.m_indiv_inc_b) },
    { userA: num(row.n_shared_inc_a), userB: num(row.o_shared_inc_b) },
    { userA: pct(row.p_income_pct_a), userB: pct(row.q_income_pct_b) },
    num(row.r_shared_inc_total),
    { userA: num(row.s_total_inc_a), userB: num(row.t_total_inc_b) },
    { userA: num(row.u_savings_a), userB: num(row.v_savings_b) },
    num(row.w_household_savings),
    { userA: pct(row.x_savings_pct_a), userB: pct(row.y_savings_pct_b) },
    pct(row.z_household_savings_pct),
    { aToB: num(row.aa_settlement_a_to_b), bToA: num(row.ab_settlement_b_to_a) },
  );
}
