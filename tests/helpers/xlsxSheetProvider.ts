import * as XLSX from 'xlsx';
import type { ISheetProvider } from '../../server/src/providers/ISheetProvider';
import { sheetToMatrix, parseTopLeft } from '../../server/src/providers/xlsxCellUtils';

/**
 * Test-only variant of server/src/providers/xlsxSheetProvider.ts: reads a fixture .xlsx
 * once, then keeps all writes in-memory only (never persisted back to disk), so running
 * the create/update/delete repository tests doesn't mutate the fixture file itself.
 */
export class XlsxSheetProvider implements ISheetProvider {
  private sheets: Map<string, string[][]> = new Map();
  private loaded = false;

  constructor(private filePath: string) {}

  private load(): void {
    if (this.loaded) return;
    const wb = XLSX.readFile(this.filePath, { cellDates: true });
    for (const name of wb.SheetNames) {
      this.sheets.set(name, sheetToMatrix(wb.Sheets[name]));
    }
    this.loaded = true;
  }

  private sheet(sheetName: string): string[][] {
    if (!this.sheets.has(sheetName)) this.sheets.set(sheetName, []);
    return this.sheets.get(sheetName)!;
  }

  async getRows(sheetName: string): Promise<string[][]> {
    this.load();
    return this.sheet(sheetName);
  }

  async appendValues(sheetName: string, _range: string, values: unknown[][]): Promise<void> {
    this.load();
    const rows = this.sheet(sheetName);
    for (const row of values) {
      rows.push((row as unknown[]).map(v => String(v)));
    }
  }

  async updateValues(sheetName: string, range: string, values: unknown[][]): Promise<void> {
    this.load();
    const rows = this.sheet(sheetName);
    const { row: startRow, col: startCol } = parseTopLeft(range);
    for (let r = 0; r < values.length; r++) {
      const ri = startRow + r;
      while (rows.length <= ri) rows.push([]);
      for (let c = 0; c < (values[r] as unknown[]).length; c++) {
        const ci = startCol + c;
        while (rows[ri].length <= ci) rows[ri].push('');
        rows[ri][ci] = String((values[r] as unknown[])[c]);
      }
    }
  }

  async deleteRow(sheetName: string, rowIndex: number): Promise<void> {
    this.load();
    this.sheet(sheetName).splice(rowIndex, 1);
  }

  dump(outputPath: string): void {
    this.load();
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of this.sheets) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    }
    XLSX.writeFile(wb, outputPath);
  }
}
