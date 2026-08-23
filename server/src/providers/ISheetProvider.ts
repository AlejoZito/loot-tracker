export interface ISheetProvider {
  getRows(sheetName: string, range: string): Promise<string[][]>;
  appendValues(sheetName: string, range: string, values: unknown[][]): Promise<void>;
  updateValues(sheetName: string, range: string, values: unknown[][]): Promise<void>;
  deleteRow(sheetName: string, rowIndex: number): Promise<void>;
}
