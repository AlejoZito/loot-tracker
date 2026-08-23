import type { IAppSettingsRepository, AppSettings } from './IAppSettingsRepository';

/**
 * Settings for the sheet datasources, which have nowhere to store them.
 *
 * The currency list must stay within USD/ARS/EUR: the sheets convert anything else to
 * zero, so a fourth currency here would record expenses every summary counts as nothing.
 */
export class DefaultAppSettingsRepository implements IAppSettingsRepository {
  async get(): Promise<AppSettings> {
    return {
      mainCurrency: 'USD',
      defaultExpenseCurrency: 'ARS',
      locale: 'es-AR',
      timezone: 'America/Argentina/Buenos_Aires',
      availableCurrencies: [
        { code: 'ARS', name: 'Argentine Peso', symbol: '$', decimalPlaces: 2 },
        { code: 'USD', name: 'US Dollar', symbol: 'US$', decimalPlaces: 2 },
        { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
      ],
    };
  }
}
