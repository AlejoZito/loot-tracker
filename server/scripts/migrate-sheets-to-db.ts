/**
 * One-shot backfill: Google Sheets (or the local .xlsx) -> Postgres.
 *
 *   npm run migrate:db --prefix server
 *
 * Reads through ISheetProvider and sheetMapper so the Spanish->English translation and
 * the date-format handling stay in one place.
 *
 * Imports source tables only. `summary`, `summary_by_categories` and
 * `expenses_by_installments` are SQL views and must not be imported.
 *
 * Idempotent: every write is an upsert on the natural key, so re-running is safe.
 *
 * Env:
 *   MIGRATE_FROM=google-sheets | xlsx   (default: google-sheets)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ISheetProvider } from '../src/providers/ISheetProvider';
import { GoogleSheetProvider } from '../src/providers/googleSheetProvider';
import { XlsxSheetProvider } from '../src/providers/xlsxSheetProvider';
import { getDb } from '../src/providers/dbClient';
import {
  rowToExpense,
  rowToCategory,
  rowToHabitCategory,
  habitRowToHabits,
  isBlankRow,
  SHEET_RANGES,
} from '../src/mappers/sheetMapper';
import { dateTimeToDb } from '../src/mappers/dbMapper';
import { budgetUsers, xlsxDataPath, xlsxSeedPath } from '../src/config/appConfig';

const CHUNK = 500;

function pickProvider(): ISheetProvider {
  const from = process.env.MIGRATE_FROM || 'google-sheets';
  if (from === 'xlsx') return new XlsxSheetProvider(xlsxDataPath, xlsxSeedPath);
  return new GoogleSheetProvider();
}

async function upsertAll(
  db: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<number> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  return rows.length;
}

/**
 * The `exchange` tab stores M/D/YY ('4/1/24' = 1 April 2024). sheetDateToISO cannot be
 * used here: it reads a slash-date without a time as DD/MM/YYYY, yielding 4 January
 * year 24. Rates are monthly, so this returns the first of the month.
 */
function exchangePeriodToISO(raw: string): string | null {
  const s = (raw || '').trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}/.test(s)) return `${s.slice(0, 7)}-01`;

  const parts = s.split(/[/-]/);
  if (parts.length < 2) return null;
  const month = parseInt(parts[0], 10);
  let year = parseInt(parts[2] ?? parts[1], 10);
  if (!Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (year < 100) year += 2000;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

async function main() {
  const provider = pickProvider();
  const db = getDb();
  const report: string[] = [];

  // Seeded from config, not the migration: the ids are deployment specific
  // (BUDGET_USER_A/B), and the summary view joins on this to resolve slots.
  report.push(`budget_users: ${await upsertAll(db, 'budget_users',
    budgetUsers.map((u, i) => ({ id: u.id, label: u.label, slot: u.slot, sort_order: i })),
    'id')}`);

  const categoryRows = await provider.getRows('expenses-categories', SHEET_RANGES.categories);
  const categories = categoryRows.slice(1).filter(r => !isBlankRow(r)).map(rowToCategory);
  report.push(`categories: ${await upsertAll(db, 'categories',
    categories.map((c, i) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji || null,
      type: c.type,
      user_id: c.user === 'shared' ? null : c.user,
      sort_order: i,
    })),
    'id')}`);

  const habitCatRows = await provider.getRows('habits-categories', SHEET_RANGES.habitsCategories);
  const habitCategories = habitCatRows.slice(1).filter(r => !isBlankRow(r)).map(rowToHabitCategory);
  report.push(`habit_categories: ${await upsertAll(db, 'habit_categories',
    habitCategories.map((c, i) => ({
      id: c.id, name: c.name, emoji: c.emoji || null,
      default_value: c.defaultValue, sort_order: i,
    })),
    'id')}`);

  // The sheet's columns are named for the target currency but hold units-per-USD:
  // `usd` is ARS per USD, `eur` is EUR per USD. A USD row of 1.0 is synthesised per
  // period so the conversion joins in the views stay uniform.
  const exchangeRows = await provider.getRows('exchange', 'A:C');
  const rates: Record<string, unknown>[] = [];
  for (const row of exchangeRows.slice(1)) {
    const period = exchangePeriodToISO(row[0]);
    if (!period) continue;
    const ars = parseFloat(row[1]);
    const eur = parseFloat(row[2]);
    rates.push({ period, currency: 'USD', units_per_usd: 1 });
    if (Number.isFinite(ars) && ars > 0) rates.push({ period, currency: 'ARS', units_per_usd: ars });
    if (Number.isFinite(eur) && eur > 0) rates.push({ period, currency: 'EUR', units_per_usd: eur });
  }
  report.push(`exchange_rates: ${await upsertAll(db, 'exchange_rates', rates, 'period,currency')}`);

  const expenseRows = await provider.getRows('expenses', SHEET_RANGES.expenses);
  const expenses = expenseRows.slice(1).filter(r => !isBlankRow(r)).map(rowToExpense);

  // expenses.currency is FK-constrained; an unknown currency fails the whole batch
  // with an opaque message, so check before writing.
  const { data: currencyRows } = await db.from('currencies').select('code');
  const known = new Set((currencyRows ?? []).map((c: { code: string }) => c.code));
  const unknown = [...new Set(expenses.map(e => e.currency).filter(c => !known.has(c)))];
  if (unknown.length > 0) {
    throw new Error(
      `Expenses reference currencies with no row in \`currencies\`: ${unknown.join(', ')}. ` +
      `Add them (and their exchange_rates) before backfilling.`,
    );
  }

  report.push(`expenses: ${await upsertAll(db, 'expenses',
    expenses.map(e => ({
      id: e.id,
      occurred_at: dateTimeToDb(e.date),
      category: e.category,
      amount: e.amount,
      installments: Math.max(e.installments || 1, 1),
      currency: e.currency,
      notes: e.notes || '',
      type: e.type,
      shared: e.shared,
      user_id: e.user,
    })),
    'id')}`);

  const habitRows = await provider.getRows('habits', SHEET_RANGES.habits);
  const habits = habitRows.slice(1)
    .filter(r => !isBlankRow(r))
    .flatMap(r => habitRowToHabits(r, habitCategories));

  const knownHabitCats = new Set(habitCategories.map(c => c.id));
  const habitPayload = habits
    .filter(h => knownHabitCats.has(h.categoryId) && h.day.toISO())
    .map(h => ({
      day: h.day.toISO(), category_id: h.categoryId, user_id: h.user, value: h.value,
    }));
  report.push(`habits: ${await upsertAll(db, 'habits', habitPayload, 'day,category_id,user_id')}`);

  console.log('Backfill complete (rows upserted):');
  for (const line of report) console.log(`  ${line}`);
  console.log('\nDerived data (summary, summary_by_categories, expenses_by_installments)');
  console.log('is computed by SQL views — nothing to import, nothing to regenerate.');
}

main().catch(err => {
  console.error('Backfill failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
