// Common DTOs shared between client and server
// All field names in English

export type TransactionType = 'income' | 'expense';
export type CategoryType = 'income' | 'expense';
export type Currency = 'ARS' | 'USD' | 'EUR';

export interface Expense {
  id: string;
  date: string;         // YYYY-MM-DD
  category: string;
  amount: number;
  installments: number;
  currency: Currency;
  notes: string;
  type: TransactionType;
  shared: boolean;
  user?: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  type: CategoryType;
  user: string; // budget user id, or 'shared'
}

export interface MonthlySummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: Record<string, number>;
}

export interface HabitCategory {
  id: string;
  name: string;
  emoji: string;
  defaultValue: boolean;
}

export interface Habit {
  day: string;          // YYYY-MM-DD
  categoryId: string;
  value: boolean;
  user?: string;
}

export interface HabitMonthSummary {
  categoryId: string;
  emoji: string;
  name: string;
  successDays: number;
  totalDays: number;
  percentage: number;
}

export interface UserPair {
  userA: number;
  userB: number;
}

export interface SummaryMonth {
  year: number;
  monthLabel: string;
  individualExpenses: UserPair;
  sharedExpenses: UserPair & { total: number };
  sharedExpensesPercent: UserPair;
  totalExpenses: UserPair;
  individualIncome: UserPair;
  sharedIncome: UserPair;
  incomePercent: UserPair;
  sharedIncomeTotal: number;
  totalIncome: UserPair;
  savings: UserPair;
  householdSavings: number;
  savingsPercent: UserPair;
  householdSavingsPercent: number;
  /** Net settlement between the two slots. */
  saldo: { aToB: number; bToA: number };
}

/** UI-ready DTO for income breakdown by category */
export interface IncomeCategoryBreakdown {
  category: string;
  user: string;
  shared: number;
  personal: number;
  total: number;
}

export interface CategoryHistoryRow {
  period: string; // YYYY-MM
  user: string;
  category: string;
  type: 'income' | 'expense';
  personal: number;
  shared: number;
  total: number;
}

export interface HabitHistoryRow {
  period: string;      // YYYY-MM
  categoryId: string;
  name: string;
  emoji: string;
  user: string;
  successDays: number;
  totalDays: number;
  percentage: number;  // 0–100
}

export interface InstallmentExpense {
  id: string;
  period: string;            // YYYY-MM-DD (installment date)
  originPeriod: string;      // YYYY-MM-DD (original purchase date)
  category: string;
  installmentAmount: number;
  installments: number;
  installmentNumber: number; // 1-based index (1 = first installment)
  currency: Currency;
  notes: string;
  type: TransactionType;
  shared: boolean;
  user: string;
  usdCurrentMonth: number;   // USD at installment month's exchange rate
  usdOrigin: number;         // USD at original purchase month's exchange rate
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  budgetUser: string;
}

/** Public, auth-protected app configuration — display labels for the two budget-user slots. */
export interface AppConfig {
  users: { slot: 'userA' | 'userB'; id: string; label: string }[];
}
