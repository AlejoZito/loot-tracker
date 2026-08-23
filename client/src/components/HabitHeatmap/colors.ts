import type { HabitCategory } from '../../types';

export const HABIT_COLORS = [
  '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6',
  '#f79646', '#d99694', '#77933c', '#2c4d75', '#b5a1c5',
];

export function colorForCategory(categoryId: string, categories: HabitCategory[]): string {
  const index = categories.findIndex(c => c.id === categoryId);
  return HABIT_COLORS[Math.max(0, index) % HABIT_COLORS.length];
}
