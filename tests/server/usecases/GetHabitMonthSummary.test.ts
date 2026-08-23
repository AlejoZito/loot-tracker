import { describe, it, expect } from 'vitest';
import { getHabitMonthSummary } from '../../../server/src/usecases/habits';
import { Habit, HabitCategory } from '../../../server/src/domain/habit';
import { Date as DomainDate } from '../../../server/src/domain/date';

const categories: HabitCategory[] = [
  new HabitCategory('gym',  'Gym',  '🏋️', false),
  new HabitCategory('read', 'Read', '📚', true),
];

const DAYS = ['2024-06-01', '2024-06-02', '2024-06-03'].map(DomainDate.fromISO);

function makeHabits(gymValues: boolean[], readValues: boolean[]): Habit[] {
  const habits: Habit[] = [];
  gymValues.forEach((v, i) => habits.push(new Habit(DAYS[i], 'gym', v, 'userA')));
  readValues.forEach((v, i) => habits.push(new Habit(DAYS[i], 'read', v, 'userA')));
  return habits;
}

describe('getHabitMonthSummary', () => {
  it('counts success days per category, using distinct recorded days as the denominator', () => {
    const habits = makeHabits([true, false, true], [true, true, false]);
    const result = getHabitMonthSummary(habits, categories);

    const gym  = result.find(r => r.categoryId === 'gym')!;
    const read = result.find(r => r.categoryId === 'read')!;

    expect(gym.successDays).toBe(2);
    expect(read.successDays).toBe(2);
    expect(gym.totalDays).toBe(3);
    expect(read.totalDays).toBe(3);
  });

  it('calculates percentage correctly', () => {
    const habits = makeHabits([true, true], [false, false]);
    const result = getHabitMonthSummary(habits, categories);

    const gym = result.find(r => r.categoryId === 'gym')!;
    expect(gym.percentage).toBe(100);
    const read = result.find(r => r.categoryId === 'read')!;
    expect(read.percentage).toBe(0);
  });

  it('divides by recorded days, not calendar days elapsed', () => {
    // Only 2 of the 3 days have a "gym" record — a day with no record must not
    // count against the percentage (this is what previously caused the main
    // Habits page to disagree with the cross-month Historial value).
    const habits = [
      new Habit(DAYS[0], 'gym', true, 'userA'),
      new Habit(DAYS[1], 'gym', true, 'userA'),
    ];
    const result = getHabitMonthSummary(habits, categories);
    const gym = result.find(r => r.categoryId === 'gym')!;
    expect(gym.totalDays).toBe(2);
    expect(gym.percentage).toBe(100);
  });

  it('returns 0 percentage when there are no recorded days', () => {
    const result = getHabitMonthSummary([], categories);
    for (const entry of result) {
      expect(entry.percentage).toBe(0);
      expect(entry.totalDays).toBe(0);
    }
  });

  it('includes emoji and name from category', () => {
    const result = getHabitMonthSummary([], categories);
    const gym = result.find(r => r.categoryId === 'gym')!;
    expect(gym.emoji).toBe('🏋️');
    expect(gym.name).toBe('Gym');
  });

  it('returns one entry per category', () => {
    const result = getHabitMonthSummary([], categories);
    expect(result).toHaveLength(2);
  });
});
