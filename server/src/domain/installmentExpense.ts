import { Date as DomainDate } from './date';

export type TransactionType = 'income' | 'expense';
export type Currency = 'ARS' | 'USD' | 'EUR';

export class InstallmentExpense {
  constructor(
    public readonly id: string,
    public readonly period: DomainDate,        // installment date (may differ from origin for multi-installment)
    public readonly originPeriod: DomainDate,  // original purchase date
    public readonly category: string,
    public readonly installmentAmount: number,
    public readonly installments: number,
    public readonly currency: Currency,
    public readonly notes: string,
    public readonly type: TransactionType,
    public readonly shared: boolean,
    public readonly user: string,
    public readonly usdCurrentMonth: number,   // USD at installment month's exchange rate
    public readonly usdOrigin: number,         // USD at original purchase month's exchange rate
  ) {}
}
