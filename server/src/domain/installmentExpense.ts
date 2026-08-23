import { Date as DomainDate } from './date';

export type TransactionType = 'income' | 'expense';
export type Currency = 'ARS' | 'USD' | 'EUR' | 'BRL';

export class InstallmentExpense {
  constructor(
    public readonly id: string,
    public readonly period: DomainDate,        // installment date (may differ from origin for multi-installment)
    public readonly originPeriod: DomainDate,  // original purchase date
    public readonly category: string,
    public readonly installmentAmount: number,
    public readonly installments: number,
    public readonly installmentNumber: number, // 1-based
    public readonly currency: Currency,
    public readonly notes: string,
    public readonly type: TransactionType,
    public readonly shared: boolean,
    public readonly user: string,
  ) {}
}
