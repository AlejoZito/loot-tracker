import { describe, it, expect } from 'vitest';
import {
  rowToHabitCategory,
  habitRowToHabits,
  habitsToRow,
} from '../../../server/src/mappers/sheetMapper';
import { Date as DomainDate } from '../../../server/src/domain/date';
import type { HabitCategory, Habit } from '../../../common/types';

// ---------------------------------------------------------------------------
// Habit category mapping
// ---------------------------------------------------------------------------
describe('rowToHabitCategory', () => {
  it('maps fields correctly', () => {
    const row = ['hab-1', 'Exercise', '🏋️', 'TRUE'];
    expect(rowToHabitCategory(row)).toEqual({
      id: 'hab-1',
      name: 'Exercise',
      emoji: '🏋️',
      defaultValue: true,
    });
  });

  it('parses FALSE default', () => {
    expect(rowToHabitCategory(['x', 'y', 'z', 'FALSE']).defaultValue).toBe(false);
  });

  it('treats missing default as false', () => {
    expect(rowToHabitCategory(['x', 'y', 'z']).defaultValue).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Habit row mapping (transposed)
// ---------------------------------------------------------------------------
describe('habitRowToHabits', () => {
  const categories: HabitCategory[] = [
    { id: 'exercise', name: 'Exercise', emoji: '🏋️', defaultValue: true },
    { id: 'reading', name: 'Reading', emoji: '📖', defaultValue: false },
  ];

  it('maps a full row to habit array', () => {
    const row = ['15/06/2024', 'TRUE', 'FALSE', 'userA'];
    const habits = habitRowToHabits(row, categories);
    expect(habits[0].day).toBeInstanceOf(DomainDate);
    expect(habits[0].day.toISO()).toBe('2024-06-15');
    expect(habits[0].categoryId).toBe('exercise');
    expect(habits[0].value).toBe(true);
    expect(habits[0].user).toBe('userA');
    expect(habits[1].day.toISO()).toBe('2024-06-15');
    expect(habits[1].categoryId).toBe('reading');
    expect(habits[1].value).toBe(false);
  });

  it('defaults missing values to false', () => {
    const row = ['15/06/2024'];
    const habits = habitRowToHabits(row, categories);
    expect(habits.every(h => h.value === false)).toBe(true);
  });
});

describe('habitsToRow', () => {
  const categories: HabitCategory[] = [
    { id: 'exercise', name: 'Exercise', emoji: '🏋️', defaultValue: true },
    { id: 'reading', name: 'Reading', emoji: '📖', defaultValue: false },
  ];

  it('converts habits array back to row', () => {
    const habits: Habit[] = [
      { day: '2024-06-15', categoryId: 'exercise', value: true },
      { day: '2024-06-15', categoryId: 'reading', value: false },
    ];
    const row = habitsToRow('2024-06-15', habits, categories, 'userA');
    expect(row).toEqual(['2024-06-15', true, false, 'userA']);
  });

  it('defaults missing habit to false', () => {
    const habits: Habit[] = [
      { day: '2024-06-15', categoryId: 'exercise', value: true },
    ];
    const row = habitsToRow('2024-06-15', habits, categories, 'userA');
    expect(row).toEqual(['2024-06-15', true, false, 'userA']);
  });
});
