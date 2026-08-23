import type { ISheetProvider } from './ISheetProvider';
import { GoogleSheetProvider } from './googleSheetProvider';
import { XlsxSheetProvider } from './xlsxSheetProvider';
import { dataSource, xlsxDataPath, xlsxSeedPath } from '../config/appConfig';

/**
 * The single ISheetProvider instance the sheet-backed repositories read/write through.
 *
 * ISheetProvider is a positional cell-matrix API: it addresses data by spreadsheet range
 * and deletes rows by physical index, with no filtering and no ids. A non-spreadsheet
 * datasource belongs at the repository interfaces instead — see repositories/index.ts.
 */
export const sheetProvider: ISheetProvider =
  dataSource === 'google-sheets'
    ? new GoogleSheetProvider()
    : new XlsxSheetProvider(xlsxDataPath, xlsxSeedPath);
