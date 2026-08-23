import { habitRepository } from '../repositories';
import { Habit } from '../domain/habit';
import { Date as DomainDate } from '../domain/date';
import type { HabitCategory } from '../domain/habit';
import type { HabitMonthSummary, HabitHistoryRow } from '../../../common/types';

export async function getHabitCategories(): Promise<HabitCategory[]> {
  return habitRepository.getCategories();
}

export async function getHabitsForDay(day: string): Promise<Habit[]> {
  return habitRepository.getByDay(day);
}

export async function getRecentHabits(days: number): Promise<Habit[]> {
  return habitRepository.getRecent(days);
}

export function getHabitMonthSummary(
  habits: Habit[],
  categories: HabitCategory[],
): HabitMonthSummary[] {
  return categories.map(cat => {
    const catHabits = habits.filter(h => h.categoryId === cat.id);
    const recordedDays = new Set(catHabits.map(h => h.day.toISO()));
    const totalDays = recordedDays.size;
    const successDays = catHabits.filter(h => h.value).length;
    return {
      categoryId: cat.id,
      emoji: cat.emoji,
      name: cat.name,
      successDays,
      totalDays,
      percentage: totalDays > 0 ? Math.round((successDays / totalDays) * 100) : 0,
    };
  });
}

export async function computeHabitMonthSummary(year: number, month: number): Promise<HabitMonthSummary[]> {
  const [categories, habits] = await Promise.all([
    habitRepository.getCategories(),
    habitRepository.getByMonth(year, month),
  ]);

  return getHabitMonthSummary(habits, categories);
}

export async function getHabitHistory(): Promise<HabitHistoryRow[]> {
  const [categories, habits] = await Promise.all([
    habitRepository.getCategories(),
    habitRepository.getAll(),
  ]);

  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Group by period+categoryId+user, tracking unique days and successes
  const key = (period: string, catId: string, user: string) => `${period}|${catId}|${user}`;
  const successMap = new Map<string, number>();
  const daysMap = new Map<string, Set<string>>();

  for (const habit of habits) {
    const period = `${habit.day.year}-${String(habit.day.month).padStart(2, '0')}`;
    const dayISO = habit.day.toISO();
    const k = key(period, habit.categoryId, habit.user);

    if (!daysMap.has(k)) daysMap.set(k, new Set());
    daysMap.get(k)!.add(dayISO);

    if (habit.value) {
      successMap.set(k, (successMap.get(k) ?? 0) + 1);
    }
  }

  const rows: HabitHistoryRow[] = [];
  for (const [k, days] of daysMap) {
    const [period, categoryId, user] = k.split('|');
    const cat = categoryMap.get(categoryId);
    if (!cat) continue;
    const totalDays = days.size;
    const successDays = successMap.get(k) ?? 0;
    rows.push({
      period,
      categoryId,
      name: cat.name,
      emoji: cat.emoji,
      user,
      successDays,
      totalDays,
      percentage: totalDays > 0 ? Math.round((successDays / totalDays) * 100) : 0,
    });
  }

  return rows.sort((a, b) => a.period.localeCompare(b.period));
}

export async function upsertHabit(
  day: string,
  categoryId: string,
  value: boolean,
  user: string,
): Promise<Habit> {
  const categories = await habitRepository.getCategories();
  return habitRepository.upsert(new Habit(DomainDate.fromISO(day), categoryId, value, user), categories, user);
}

export async function initHabitDay(day: string, user: string): Promise<Habit[]> {
  const categories = await habitRepository.getCategories();
  return habitRepository.initDay(day, categories, user);
}
