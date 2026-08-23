import type { Currency } from '../domain/expense';

export interface CurrencyOption {
  code: Currency;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

/**
 * `mainCurrency` is what every summary figure and installment conversion is expressed in.
 * `availableCurrencies` is the set offered when recording an expense. Separate concerns:
 * the currency you spend in is not the one you report in.
 */
export interface AppSettings {
  mainCurrency: Currency;
  defaultExpenseCurrency: Currency;
  locale: string;
  availableCurrencies: CurrencyOption[];
}

export interface IAppSettingsRepository {
  get(): Promise<AppSettings>;
}
