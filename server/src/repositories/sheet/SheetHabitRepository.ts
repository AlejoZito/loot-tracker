import type { ISheetProvider } from '../../providers/ISheetProvider';
import { sheetProvider } from '../../providers/sheetProvider';
import {
  rowToHabitCategory,
  habitRowToHabits,
  isoToSheetDate,
  sheetDateToISO,
  isBlankRow,
  SHEET_RANGES,
} from '../../mappers/sheetMapper';
import type { IHabitRepository } from '../IHabitRepository';
import { Habit } from '../../domain/habit';
import { Date as DomainDate } from '../../domain/date';
import type { HabitCategory } from '../../domain/habit';

export class SheetHabitRepository implements IHabitRepository {
  constructor(private readonly provider: ISheetProvider) {}

  async getCategories(): Promise<HabitCategory[]> {
    const rows = await this.provider.getRows('habits-categories', SHEET_RANGES.habitsCategories);
    if (rows.length <= 1) return [];
    return rows.slice(1).filter(r => !isBlankRow(r)).map(rowToHabitCategory);
  }

  async getByMonth(year: number, month: number): Promise<Habit[]> {
    const categories = await this.getCategories();
    const rows = await this.provider.getRows('habits', SHEET_RANGES.habits);
    if (rows.length <= 1) return [];

    const allHabits: Habit[] = [];
    for (const row of rows.slice(1)) {
      const iso = sheetDateToISO(row[0]);
      const [y, m] = iso.split('-').map(Number);
      if (m === month && y === year) {
        allHabits.push(...habitRowToHabits(row, categories));
      }
    }
    return allHabits;
  }

  async getAll(): Promise<Habit[]> {
    const categories = await this.getCategories();
    const rows = await this.provider.getRows('habits', SHEET_RANGES.habits);
    if (rows.length <= 1) return [];
    const allHabits: Habit[] = [];
    for (const row of rows.slice(1)) {
      if (isBlankRow(row)) continue;
      allHabits.push(...habitRowToHabits(row, categories));
    }
    return allHabits;
  }

  async getByDay(day: string): Promise<Habit[]> {
    const categories = await this.getCategories();
    const rows = await this.provider.getRows('habits', SHEET_RANGES.habits);
    if (rows.length <= 1) return [];

    const row = rows.slice(1).find(r => sheetDateToISO(r[0]) === day);
    if (!row) return [];
    return habitRowToHabits(row, categories);
  }

  async getRecent(days: number): Promise<Habit[]> {
    const categories = await this.getCategories();
    const rows = await this.provider.getRows('habits', SHEET_RANGES.habits);
    if (rows.length <= 1) return [];

    const validDays = new Set<string>();
    const today = new globalThis.Date();
    for (let i = 0; i < days; i++) {
      const d = new globalThis.Date(today);
      d.setDate(d.getDate() - i);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      validDays.add(`${d.getFullYear()}-${mm}-${dd}`);
    }

    const allHabits: Habit[] = [];
    for (const row of rows.slice(1)) {
      if (validDays.has(sheetDateToISO(row[0]))) {
        allHabits.push(...habitRowToHabits(row, categories));
      }
    }
    return allHabits;
  }

  async upsert(habit: Habit, categories: HabitCategory[], user: string): Promise<Habit> {
    const rows = await this.provider.getRows('habits', SHEET_RANGES.habits);
    const allRows = rows || [];

    const rowIndex = allRows.findIndex(
      (row, i) => i > 0 && sheetDateToISO(row[0]) === habit.day.toISO() && (row[categories.length + 1] || '') === user,
    );

    const catIndex = categories.findIndex(c => c.id === habit.categoryId);
    if (catIndex === -1) throw new Error(`Unknown category: ${habit.categoryId}`);
    const colIndex = catIndex + 1;

    if (rowIndex !== -1) {
      const colLetter = String.fromCharCode(65 + colIndex);
      await this.provider.updateValues('habits', `${colLetter}${rowIndex + 1}`, [[habit.value]]);
    } else {
      const newRow: (string | boolean)[] = [isoToSheetDate(habit.day.toISO())];
      for (let i = 0; i < categories.length; i++) {
        newRow.push(i === catIndex ? habit.value : categories[i].defaultValue);
      }
      newRow.push(user);
      await this.provider.appendValues('habits', SHEET_RANGES.habits, [newRow]);
    }

    return habit;
  }

  async initDay(day: string, categories: HabitCategory[], user: string): Promise<Habit[]> {
    const rows = await this.provider.getRows('habits', SHEET_RANGES.habits);
    const allRows = rows || [];

    const existingRow = allRows.slice(1).find(
      r => sheetDateToISO(r[0]) === day && (r[categories.length + 1] || '') === user,
    );

    if (existingRow) {
      return habitRowToHabits(existingRow, categories);
    }

    const newRow: (string | boolean)[] = [isoToSheetDate(day), ...categories.map(c => c.defaultValue), user];
    await this.provider.appendValues('habits', SHEET_RANGES.habits, [newRow]);

    return categories.map(cat => new Habit(DomainDate.fromISO(day), cat.id, cat.defaultValue, user));
  }
}

export const habitRepository = new SheetHabitRepository(sheetProvider);
