import type { IAppSettingsRepository, AppSettings } from './IAppSettingsRepository';

/**
 * Settings for the sheet datasources, which have nowhere to store them.
 *
 * The currency list must stay a subset of what `calcularUSD` in cuotificar.gs handles: it
 * returns 0 for anything outside USD/ARS/EUR, so adding a currency here would record
 * expenses that every summary silently counts as zero.
 */
export class DefaultAppSettingsRepository implements IAppSettingsRepository {
  async get(): Promise<AppSettings> {
    return {
      mainCurrency: 'USD',
      defaultExpenseCurrency: 'ARS',
      locale: 'es-AR',
      currencies: [
        { code: 'ARS', name: 'Argentine Peso', symbol: '$', decimalPlaces: 2 },
        { code: 'USD', name: 'US Dollar', symbol: 'US$', decimalPlaces: 2 },
        { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
      ],
    };
  }
}
