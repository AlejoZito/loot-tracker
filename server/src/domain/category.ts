export type CategoryType = 'income' | 'expense';

export class Category {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly emoji: string,
    public readonly type: CategoryType,
    public readonly user: string,
  ) {}
}
