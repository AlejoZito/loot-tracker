// Maps Google Sheets rows → domain entities (no common/types imports)
import { Period } from '../domain/period';
import { DateTime } from '../domain/dateTime';
import { Date as DomainDate } from '../domain/date';
import { CategoryTransaction } from '../domain/categoryTransaction';
import { Expense } from '../domain/expense';
import type { Currency, TransactionType } from '../domain/expense';
import { Category, CategoryType } from '../domain/category';
import { HabitCategory, Habit } from '../domain/habit';
import { MonthlySummary } from '../domain/monthlySummary';
import { InstallmentExpense } from '../domain/installmentExpense';

function periodFromYYYYMM(s: string): Period {
  const [y, m] = s.split('-').map(Number);
  return new Period(y, m);
}

// Pass through YYYY-MM-DD for writing to Sheets (same format as expenses)
export function isoToSheetDate(iso: string): string {
  return iso;
}

/**
 * True when a sheet row carries no actual data.
 *
 * Both Google Sheets and .xlsx files routinely report a range far larger than the rows
 * that were actually filled in (a tab sized A1:E1000 with 19 real rows is completely
 * normal). Without this guard, every trailing empty row maps to a blank entity — e.g.
 * ~980 empty categories rendering as broken icons in the add-expense form.
 */
export function isBlankRow(row: string[]): boolean {
  return !row || row.every(cell => (cell ?? '').trim() === '');
}

// Convert Sheets date formats → YYYY-MM-DD (DTO/ISO format)
//
// Sheet date formats by sheet:
//   expenses        → M/D/YYYY H:MM:SS  (e.g. "6/20/2024 0:00:00")  — US format with time
//   habits          → DD/MM/YYYY        (e.g. "15/06/2024")          — day-first, no time
//   (passthrough)   → YYYY-MM-DD        (already ISO)
//
// Discriminator: presence of a space (time component) identifies expenses format (M/D/YYYY).
export function sheetDateToISO(d: string): string {
  const s = (d || '').trim();
  if (!s) return '';
  // Already ISO (YYYY-MM-DD or YYYY-MM-DD H:mm)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parts = s.split('/');
  if (parts.length === 3) {
    if (s.includes(' ')) {
      // M/D/YYYY H:MM:SS  (expenses)
      const [month, day, yearAndTime] = parts;
      const yyyy = yearAndTime.split(' ')[0];
      return `${yyyy}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // DD/MM/YYYY  (habits)
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return s;
}

// Sheet column indices for expenses (A=0, B=1, etc.)
const EXPENSE_COLUMNS = {
  id: 0,           // A: id
  periodo: 1,      // B: periodo (date)
  categoria: 2,    // C: categoria (category)
  monto: 3,        // D: monto (amount)
  cuotas: 4,       // E: cuotas (installments)
  moneda: 5,       // F: moneda (currency)
  comentario: 6,   // G: comentario (notes)
  tipo: 7,         // H: tipo (type) - 'Ingreso'/'Egreso'
  compartido: 8,   // I: compartido (shared) - 'Si'/'No'
  usuario: 9,      // J: usuario (user)
} as const;

// Sheet column indices for categories
const CATEGORY_COLUMNS = {
  id: 0,           // A: id
  nombre: 1,       // B: nombre (name)
  emoji: 2,        // C: emoji
  tipo: 3,         // D: tipo (type) - 'Ingreso'/'Egreso'
  usuario: 4,      // E: usuario (user) - 'shared' or a budget-user id
} as const;

// Spanish to English value mappings
const TYPE_MAP = {
  toEnglish: { 'Ingreso': 'income', 'Egreso': 'expense' } as const,
  toSpanish: { 'income': 'Ingreso', 'expense': 'Egreso' } as const,
};

// Case-insensitive category type lookup
function parseCategoryType(value: string | undefined): CategoryType {
  if (!value) return 'expense';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'ingreso' || normalized === 'income') return 'income';
  return 'expense';
}

function parseShared(value: string | undefined): boolean {
  const v = (value || '').trim().toLowerCase();
  return v === 'si';
}

// Convert sheet row → Expense
export function rowToExpense(row: string[]): Expense {
  return new Expense(
    row[EXPENSE_COLUMNS.id] || '',
    DateTime.fromSheetExpense(row[EXPENSE_COLUMNS.periodo] || ''),
    row[EXPENSE_COLUMNS.categoria] || '',
    parseSheetCurrency(row[EXPENSE_COLUMNS.monto]),
    Number(row[EXPENSE_COLUMNS.cuotas]) || 1,
    (row[EXPENSE_COLUMNS.moneda] as Currency) || 'ARS',
    row[EXPENSE_COLUMNS.comentario] || '',
    TYPE_MAP.toEnglish[row[EXPENSE_COLUMNS.tipo] as keyof typeof TYPE_MAP.toEnglish] || 'expense',
    parseShared(row[EXPENSE_COLUMNS.compartido]),
    row[EXPENSE_COLUMNS.usuario] || '',
  );
}

// Convert Expense → sheet row
export function expenseToRow(expense: Expense): string[] {
  return [
    expense.id,
    expense.date.toISODateTime(),
    expense.category,
    String(expense.amount),
    String(expense.installments),
    expense.currency,
    expense.notes,
    TYPE_MAP.toSpanish[expense.type],
    expense.shared ? 'Si' : 'No',
    expense.user || '',
  ];
}

// Convert sheet row → Category
export function rowToCategory(row: string[]): Category {
  return new Category(
    row[CATEGORY_COLUMNS.id] || '',
    row[CATEGORY_COLUMNS.nombre] || '',
    row[CATEGORY_COLUMNS.emoji] || '',
    parseCategoryType(row[CATEGORY_COLUMNS.tipo]),
    (row[CATEGORY_COLUMNS.usuario] || 'shared').trim().toLowerCase(),
  );
}

// Convert Category → sheet row
export function categoryToRow(category: Category): string[] {
  return [
    category.id,
    category.name,
    category.emoji,
  ];
}

// Habit category columns: A=id, B=nombre, C=emoji, D=default
const HABIT_CATEGORY_COLUMNS = {
  id: 0,
  nombre: 1,
  emoji: 2,
  default: 3,
} as const;

export function rowToHabitCategory(row: string[]): HabitCategory {
  return new HabitCategory(
    row[HABIT_CATEGORY_COLUMNS.id] || '',
    row[HABIT_CATEGORY_COLUMNS.nombre] || '',
    row[HABIT_CATEGORY_COLUMNS.emoji] || '',
    (row[HABIT_CATEGORY_COLUMNS.default] || '').toUpperCase() === 'TRUE',
  );
}

export function habitCategoryToRow(cat: HabitCategory): (string | boolean)[] {
  return [
    cat.id,
    cat.name,
    cat.emoji,
    cat.defaultValue,
  ];
}

// Transposed habits: one row per day, col A = day, col B+ = category values (TRUE/FALSE)
// Column order matches the order of categories from the habits-categories sheet.

export function habitRowToHabits(row: string[], categories: HabitCategory[]): Habit[] {
  const day = DomainDate.fromISO(sheetDateToISO(row[0] || ''));
  const user = row[categories.length + 1] || '';
  return categories.map((cat, i) => new Habit(
    day,
    cat.id,
    (row[i + 1] || '').toUpperCase() === 'TRUE',
    user,
  ));
}

export function habitsToRow(day: string, habits: Habit[], categories: HabitCategory[], user: string): (string | boolean)[] {
  const row: (string | boolean)[] = [isoToSheetDate(day)];
  for (const cat of categories) {
    const habit = habits.find(h => h.categoryId === cat.id);
    row.push(habit ? habit.value : false);
  }
  row.push(user);
  return row;
}

// Currency parser: strip $ and , then parse float
export function parseSheetCurrency(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,]/g, '').trim();
  return parseFloat(cleaned) || 0;
}

// Percent parser: strip % then parse float
export function parseSheetPercent(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/%/g, '').trim();
  return parseFloat(cleaned) || 0;
}

// summary sheet layout (A:AB) — a fixed two-slot (userA/userB) household summary.
// Column order matters and must not change; slot 1 (userA) always precedes slot 2 (userB)
// within each pair, matching config.budgetUsers[0]/[1].
//   A       year
//   B       month label
//   C,D     individual expenses          (userA, userB)
//   E,F,G   shared expenses              (userA, userB, total)
//   H,I     shared expenses %            (userA, userB)
//   J,K     total expenses               (userA, userB)
//   L,M     individual income            (userA, userB)
//   N,O     shared income                (userA, userB)
//   P,Q     income %                     (userA, userB)
//   R       shared income total
//   S,T     total income                 (userA, userB)
//   U,V     savings                      (userA, userB)
//   W       household savings
//   X,Y     savings %                    (userA, userB)
//   Z       household savings %
//   AA,AB   settlement                   (userA→userB, userB→userA)
export function rowToSummaryMonth(row: string[]): MonthlySummary {
  const c = (i: number) => parseSheetCurrency(row[i]);
  const p = (i: number) => parseSheetPercent(row[i]);

  return new MonthlySummary(
    parseInt(row[0]) || 0,
    (row[1] || '').trim(),
    { userA: c(2),  userB: c(3) },
    { userA: c(4),  userB: c(5),  total: c(6) },
    { userA: p(7),  userB: p(8) },
    { userA: c(9),  userB: c(10) },
    { userA: c(11), userB: c(12) },
    { userA: c(13), userB: c(14) },
    { userA: p(15), userB: p(16) },
    c(17),
    { userA: c(18), userB: c(19) },
    { userA: c(20), userB: c(21) },
    c(22),
    { userA: p(23), userB: p(24) },
    p(25),
    { aToB: c(26), bToA: c(27) },
  );
}

// summary_by_categories columns: A=category, B=type, C=user, D=shared, E=period, F=amount
export function rowToCategorySummary(row: string[]): CategoryTransaction {
  return new CategoryTransaction(
    (row[0] || '').trim(),
    (row[1] || '').trim().toLowerCase() === 'ingreso' ? 'income' : 'expense',
    (row[2] || '').trim().toLowerCase(),
    (row[3] || '').trim().toLowerCase() === 'si',
    periodFromYYYYMM((row[4] || '').trim()),
    parseSheetCurrency(row[5]),
  );
}

// Sheet column indices for expenses_by_installments
// Columns: ID, PERÍODO, PERIODO_ORIGEN, CATEGORÍA, MONTO CUOTA, CUOTAS, MONEDA,
//          COMENTARIO, INGRESO/EGRESO, COMPARTIDO, USUARIO, USD(MES CUOTA), USD(ORIGEN), MES-AÑO
const INSTALLMENT_COLUMNS = {
  id: 0,
  period: 1,
  originPeriod: 2,
  category: 3,
  installmentAmount: 4,
  installments: 5,
  currency: 6,
  notes: 7,
  type: 8,
  shared: 9,
  user: 10,
  usdCurrentMonth: 11,
  usdOrigin: 12,
} as const;

export function rowToInstallmentExpense(row: string[]): InstallmentExpense | null {
  const id = row[INSTALLMENT_COLUMNS.id];
  if (!id) return null;
  const periodIso = sheetDateToISO(row[INSTALLMENT_COLUMNS.period] || '');
  const originIso = sheetDateToISO(row[INSTALLMENT_COLUMNS.originPeriod] || '');
  if (!periodIso || !originIso) return null;
  const rawType = (row[INSTALLMENT_COLUMNS.type] || '').toLowerCase();
  const type = rawType === 'ingreso' ? 'income' : 'expense';
  return new InstallmentExpense(
    id,
    DomainDate.fromISO(periodIso),
    DomainDate.fromISO(originIso),
    row[INSTALLMENT_COLUMNS.category] || '',
    parseSheetCurrency(row[INSTALLMENT_COLUMNS.installmentAmount]),
    Number(row[INSTALLMENT_COLUMNS.installments]) || 1,
    (row[INSTALLMENT_COLUMNS.currency] || 'ARS') as 'ARS' | 'USD',
    row[INSTALLMENT_COLUMNS.notes] || '',
    type,
    (row[INSTALLMENT_COLUMNS.shared] || '').toLowerCase() === 'si',
    row[INSTALLMENT_COLUMNS.user] || '',
    parseSheetCurrency(row[INSTALLMENT_COLUMNS.usdCurrentMonth]),
    parseSheetCurrency(row[INSTALLMENT_COLUMNS.usdOrigin]),
  );
}

// Sheet range constants
export const SHEET_RANGES = {
  expenses: 'A:J',
  categories: 'A:E',
  habitsCategories: 'A:D',
  habits: 'A:Z',
  summary: 'A:AB',
  summaryByCategories: 'A:F',
  expensesByInstallments: 'A:N',
} as const;
