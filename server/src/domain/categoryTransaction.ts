import type { Period } from './period';
import type { TransactionType } from './expense';

export class CategoryTransaction {
  constructor(
    public readonly category: string,
    public readonly type: TransactionType,
    public readonly user: string,
    public readonly shared: boolean,
    public readonly period: Period,
    public readonly amount: number,
  ) {}

  isIncome(): boolean {
    return this.type === 'income';
  }

  isExpense(): boolean {
    return this.type === 'expense';
  }

  isShared(): boolean {
    return this.shared;
  }
}
