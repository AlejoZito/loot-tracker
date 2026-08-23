import type { SupabaseClient } from '@supabase/supabase-js';
import { selectAll } from '../../providers/dbClient';
import { rowToHabit, rowToHabitCategory, type HabitRow, type HabitCategoryRow } from '../../mappers/dbMapper';
import type { IHabitRepository } from '../IHabitRepository';
import { Habit } from '../../domain/habit';
import { Date as DomainDate } from '../../domain/date';
import type { HabitCategory } from '../../domain/habit';

/** First day of the month after (year, month) — the exclusive upper bound for a month query. */
function nextMonthStart(year: number, month: number): string {
  const y = month === 12 ? year + 1 : year;
  const m = month === 12 ? 1 : month + 1;
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

/** Local wall-clock 'YYYY-MM-DD', N days back from today. */
function isoDaysAgo(days: number): string {
  const d = new globalThis.Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class DbHabitRepository implements IHabitRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getCategories(): Promise<HabitCategory[]> {
    const rows = await selectAll<HabitCategoryRow>(() =>
      this.db.from('habit_categories').select('*').order('sort_order', { ascending: true }),
    );
    return rows.map(rowToHabitCategory);
  }

  async getByMonth(year: number, month: number): Promise<Habit[]> {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const rows = await selectAll<HabitRow>(() =>
      this.db.from('habits').select('*')
        .gte('day', from).lt('day', nextMonthStart(year, month))
        .order('day', { ascending: true }),
    );
    return rows.map(rowToHabit);
  }

  async getAll(): Promise<Habit[]> {
    const rows = await selectAll<HabitRow>(() =>
      this.db.from('habits').select('*').order('day', { ascending: true }),
    );
    return rows.map(rowToHabit);
  }

  async getByDay(day: string): Promise<Habit[]> {
    const rows = await selectAll<HabitRow>(() =>
      this.db.from('habits').select('*').eq('day', day),
    );
    return rows.map(rowToHabit);
  }

  async getRecent(days: number): Promise<Habit[]> {
    // `days` counts calendar days including today, so the cutoff is days-1 back.
    const rows = await selectAll<HabitRow>(() =>
      this.db.from('habits').select('*')
        .gte('day', isoDaysAgo(Math.max(days - 1, 0)))
        .lte('day', isoDaysAgo(0))
        .order('day', { ascending: true }),
    );
    return rows.map(rowToHabit);
  }

  async upsert(habit: Habit, categories: HabitCategory[], user: string): Promise<Habit> {
    if (!categories.some(c => c.id === habit.categoryId)) {
      throw new Error(`Unknown category: ${habit.categoryId}`);
    }
    const { error } = await this.db.from('habits').upsert(
      { day: habit.day.toISO(), category_id: habit.categoryId, user_id: user, value: habit.value },
      { onConflict: 'day,category_id,user_id' },
    );
    if (error) throw new Error(`Failed to upsert habit: ${error.message}`);
    return habit;
  }

  async initDay(day: string, categories: HabitCategory[], user: string): Promise<Habit[]> {
    const { data: existing, error: readError } = await this.db
      .from('habits').select('*').eq('day', day).eq('user_id', user);
    if (readError) throw new Error(`Failed to read habits for ${day}: ${readError.message}`);

    if (existing && existing.length > 0) {
      return (existing as HabitRow[]).map(rowToHabit);
    }

    const rows = categories.map(c => ({
      day, category_id: c.id, user_id: user, value: c.defaultValue,
    }));
    if (rows.length === 0) return [];

    const { error } = await this.db.from('habits')
      .upsert(rows, { onConflict: 'day,category_id,user_id' });
    if (error) throw new Error(`Failed to initialise habits for ${day}: ${error.message}`);

    return categories.map(c => new Habit(DomainDate.fromISO(day), c.id, c.defaultValue, user));
  }
}
