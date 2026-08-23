import { DateTime } from './dateTime';

export { DateTime };

export type TransactionType = 'income' | 'expense';
export type Currency = 'ARS' | 'USD' | 'EUR';

export class Expense {
  constructor(
    public readonly id: string,
    public readonly date: DateTime,
    public readonly category: string,
    public readonly amount: number,
    public readonly installments: number,
    public readonly currency: Currency,
    public readonly notes: string,
    public readonly type: TransactionType,
    public readonly shared: boolean,
    public readonly user: string,
  ) {}
}
