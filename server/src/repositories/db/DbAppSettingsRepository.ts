import type { SupabaseClient } from '@supabase/supabase-js';
import type { IAppSettingsRepository, AppSettings, CurrencyOption } from '../IAppSettingsRepository';
import type { Currency } from '../../domain/expense';

interface ConfigRow { key: string; value: unknown }
interface CurrencyRow {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}

export class DbAppSettingsRepository implements IAppSettingsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async get(): Promise<AppSettings> {
    const [{ data: configRows, error: configError }, { data: currencyRows, error: currencyError }] =
      await Promise.all([
        this.db.from('app_config').select('key, value'),
        this.db.from('currencies').select('code, name, symbol, decimal_places')
          .eq('enabled', true).order('sort_order', { ascending: true }),
      ]);

    if (configError) throw new Error(`Failed to read app_config: ${configError.message}`);
    if (currencyError) throw new Error(`Failed to read currencies: ${currencyError.message}`);

    const settings = new Map((configRows as ConfigRow[] ?? []).map(r => [r.key, r.value]));
    const str = (key: string, fallback: string) => {
      const v = settings.get(key);
      return typeof v === 'string' && v ? v : fallback;
    };

    const available: CurrencyOption[] = (currencyRows as CurrencyRow[] ?? []).map(r => ({
      code: r.code as Currency,
      name: r.name,
      symbol: r.symbol,
      decimalPlaces: r.decimal_places ?? 2,
    }));

    return {
      mainCurrency: str('main_currency', 'USD') as Currency,
      defaultExpenseCurrency: str('default_expense_currency', 'ARS') as Currency,
      locale: str('locale', 'es-AR'),
      availableCurrencies: available.length > 0
        ? available
        : [{ code: 'ARS', name: 'Argentine Peso', symbol: '$', decimalPlaces: 2 }],
    };
  }
}
