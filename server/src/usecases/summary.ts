import { summaryRepository } from '../repositories/sheet/SheetSummaryRepository';
import type { MonthlySummary } from '../domain/monthlySummary';
import type { CategoryTransaction } from '../domain/categoryTransaction';
import type { Period } from '../domain/period';
import type { IncomeCategoryBreakdown, CategoryHistoryRow } from '../../../common/types';

export async function getSummaryByMonth(year: number, month: number): Promise<MonthlySummary | null> {
  return summaryRepository.getByMonth(year, month);
}

export function getCategoryBreakdown(
  transactions: CategoryTransaction[],
  period: Period,
  type: 'income' | 'expense',
): IncomeCategoryBreakdown[] {
  const filtered = transactions.filter(r =>
    r.type === type &&
    period.equals(r.period),
  );

  const grouped = new Map<string, IncomeCategoryBreakdown>();
  for (const row of filtered) {
    const key = `${row.user}:${row.category}`;
    const existing = grouped.get(key);
    if (existing) {
      if (row.shared) {
        existing.shared += row.amount;
      } else {
        existing.personal += row.amount;
      }
      existing.total += row.amount;
    } else {
      grouped.set(key, {
        category: row.category,
        user: row.user,
        shared: row.shared ? row.amount : 0,
        personal: row.shared ? 0 : row.amount,
        total: row.amount,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
}

export async function getCategoryHistory(): Promise<CategoryHistoryRow[]> {
  const transactions = await summaryRepository.getCategoryTransactions();

  const grouped = new Map<string, CategoryHistoryRow>();
  for (const t of transactions) {
    const key = `${t.period.toYYYYMM()}:${t.user}:${t.category}:${t.type}`;
    const existing = grouped.get(key);
    if (existing) {
      if (t.shared) existing.shared += t.amount;
      else existing.personal += t.amount;
      existing.total += t.amount;
    } else {
      grouped.set(key, {
        period: t.period.toYYYYMM(),
        user: t.user,
        category: t.category,
        type: t.type,
        personal: t.shared ? 0 : t.amount,
        shared: t.shared ? t.amount : 0,
        total: t.amount,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export async function getCategoryBreakdownForPeriod(
  period: Period,
  type: 'income' | 'expense',
): Promise<IncomeCategoryBreakdown[]> {
  const transactions = await summaryRepository.getCategoryTransactions();
  return getCategoryBreakdown(transactions, period, type);
}
