import type { ISheetProvider } from './ISheetProvider';
import { GoogleSheetProvider } from './googleSheetProvider';
import { XlsxSheetProvider } from './xlsxSheetProvider';
import { dataSource, xlsxDataPath, xlsxSeedPath } from '../config/appConfig';

/**
 * The single ISheetProvider instance every repository reads/writes through, chosen once at
 * startup based on DATA_SOURCE. This is the seam a future datasource (Postgres, SQLite,
 * Supabase, ...) would plug into — implement ISheetProvider and add a branch here.
 */
export const sheetProvider: ISheetProvider =
  dataSource === 'google-sheets'
    ? new GoogleSheetProvider()
    : new XlsxSheetProvider(xlsxDataPath, xlsxSeedPath);
