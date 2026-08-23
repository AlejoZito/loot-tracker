import type {
  Expense as ExpenseDto,
  Category as CategoryDto,
  HabitCategory as HabitCategoryDto,
  Habit as HabitDto,
  SummaryMonth,
  InstallmentExpense as InstallmentExpenseDto,
} from '../../../common/types';
import type { Expense } from '../domain/expense';
import type { Category } from '../domain/category';
import type { HabitCategory, Habit } from '../domain/habit';
import type { MonthlySummary } from '../domain/monthlySummary';
import type { InstallmentExpense } from '../domain/installmentExpense';

export function expenseToDto(e: Expense): ExpenseDto {
  return {
    id: e.id,
    date: e.date.toISO(),
    category: e.category,
    amount: e.amount,
    installments: e.installments,
    currency: e.currency,
    notes: e.notes,
    type: e.type,
    shared: e.shared,
    user: e.user,
  };
}

export function categoryToDto(c: Category): CategoryDto {
  return {
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    type: c.type,
    user: c.user,
  };
}

export function habitCategoryToDto(c: HabitCategory): HabitCategoryDto {
  return {
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    defaultValue: c.defaultValue,
  };
}

export function habitToDto(h: Habit): HabitDto {
  return {
    day: h.day.toISO(),
    categoryId: h.categoryId,
    value: h.value,
    user: h.user,
  };
}

export function monthlySummaryToDto(s: MonthlySummary): SummaryMonth {
  return {
    year: s.year,
    monthLabel: s.monthLabel,
    individualExpenses: s.individualExpenses,
    sharedExpenses: s.sharedExpenses,
    sharedExpensesPercent: s.sharedExpensesPercent,
    totalExpenses: s.totalExpenses,
    individualIncome: s.individualIncome,
    sharedIncome: s.sharedIncome,
    incomePercent: s.incomePercent,
    sharedIncomeTotal: s.sharedIncomeTotal,
    totalIncome: s.totalIncome,
    savings: s.savings,
    householdSavings: s.householdSavings,
    savingsPercent: s.savingsPercent,
    householdSavingsPercent: s.householdSavingsPercent,
    saldo: s.saldo,
  };
}

export function installmentExpenseToDto(e: InstallmentExpense): InstallmentExpenseDto {
  return {
    id: e.id,
    period: e.period.toISO(),
    originPeriod: e.originPeriod.toISO(),
    category: e.category,
    installmentAmount: e.installmentAmount,
    installments: e.installments,
    installmentNumber: e.installmentNumber,
    currency: e.currency,
    notes: e.notes,
    type: e.type,
    shared: e.shared,
    user: e.user,
  };
}

/**
 * Sort expenses by date descending (most recent first).
 * Expects dates in YYYY-MM-DD ISO format, which is guaranteed by sheetMapper.
 */
export function sortExpensesByDate(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => {
    const da = a.date.toISO();
    const db = b.date.toISO();
    return da < db ? 1 : da > db ? -1 : 0;
  });
}

/**
 * Sort, paginate, and map expenses to DTOs for the standard paginated response envelope.
 */
export function pagedExpensesResponse(
  expenses: Expense[],
  limit?: number,
  offset = 0,
): { expenses: ExpenseDto[]; total: number; hasMore: boolean } {
  const sorted = sortExpensesByDate(expenses);
  const paginated = limit !== undefined ? sorted.slice(offset, offset + limit) : sorted;
  const hasMore = limit !== undefined ? offset + limit < sorted.length : false;
  return { expenses: paginated.map(expenseToDto), total: sorted.length, hasMore };
}
