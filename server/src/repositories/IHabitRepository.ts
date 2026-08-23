import type { Habit, HabitCategory } from '../domain/habit';

export interface IHabitRepository {
  getCategories(): Promise<HabitCategory[]>;
  getByMonth(year: number, month: number): Promise<Habit[]>;
  getByDay(day: string): Promise<Habit[]>;
  getAll(): Promise<Habit[]>;
  getRecent(days: number): Promise<Habit[]>;
  upsert(habit: Habit, categories: HabitCategory[], user: string): Promise<Habit>;
  initDay(day: string, categories: HabitCategory[], user: string): Promise<Habit[]>;
}
