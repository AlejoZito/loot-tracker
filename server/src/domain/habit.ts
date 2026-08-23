import { Date } from './date';

export { Date };

export class HabitCategory {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly emoji: string,
    public readonly defaultValue: boolean,
  ) {}
}

export class Habit {
  constructor(
    public readonly day: Date,
    public readonly categoryId: string,
    public readonly value: boolean,
    public readonly user: string,
  ) {}
}
