import type { Habit, HabitCategory } from '../domain/habit';

export interface IHabitRepository {
  getCategories(): Promise<HabitCategory[]>;
  getByMonth(year: number, month: number): Promise<Habit[]>;
  getByDay(day: string): Promise<Habit[]>;
  getAll(): Promise<Habit[]>;
  /** The `days` calendar days ending on `today` ('YYYY-MM-DD'), which the caller supplies. */
  getRecent(days: number, today: string): Promise<Habit[]>;
  upsert(habit: Habit, categories: HabitCategory[], user: string): Promise<Habit>;
  initDay(day: string, categories: HabitCategory[], user: string): Promise<Habit[]>;
}
