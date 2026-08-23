import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import type { ISheetProvider } from './ISheetProvider';
import { sheetToMatrix, parseTopLeft } from './xlsxCellUtils';

/**
 * A local .xlsx file as the app's datasource — no Google Cloud project needed. Meant for
 * trying the app out or running it fully offline/local-only.
 *
 * On first use, if `filePath` doesn't exist yet, it's seeded by copying `seedPath` (the
 * bundled sample database) so you start with realistic-looking data instead of an empty
 * workbook. Writes (create/update/delete) are persisted back to `filePath` immediately.
 *
 * Only sheets the app actually mutates (expenses, habits) are ever
 * re-serialized on save — every other sheet's original XLSX.WorkSheet object (formulas,
 * shared strings, styles) is carried through untouched. This matters a lot in practice:
 * this app's derived/formula-driven tabs (summary, summary_by_categories,
 * expenses_by_installments) can be hundreds of thousands of rows, and re-serializing them
 * as plain values on every write both destroys their formulas and bloats the file by an
 * order of magnitude for no benefit — the app never writes to those tabs anyway. They're
 * effectively a read-only snapshot in xlsx mode: nothing here recomputes them as expenses
 * change (there's no live formula engine in a static file), the same way this app never
 * recomputes them against a live Google Sheet either — Sheets does that on its own.
 *
 * Unlike tests/helpers/xlsxSheetProvider.ts (which deliberately keeps every write
 * in-memory only, touched sheets included, so repository tests never mutate the test
 * fixture on disk), this provider is meant to actually persist.
 */
export class XlsxSheetProvider implements ISheetProvider {
  private workbook: XLSX.WorkBook | null = null;
  private cache: Map<string, string[][]> = new Map();
  private dirty: Set<string> = new Set();

  constructor(private filePath: string, private seedPath?: string) {}

  private ensureFileExists(): void {
    if (fs.existsSync(this.filePath)) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (this.seedPath && fs.existsSync(this.seedPath)) {
      fs.copyFileSync(this.seedPath, this.filePath);
    } else {
      XLSX.writeFile(XLSX.utils.book_new(), this.filePath);
    }
  }

  private load(): XLSX.WorkBook {
    if (this.workbook) return this.workbook;
    this.ensureFileExists();
    this.workbook = XLSX.readFile(this.filePath, { cellDates: true });
    return this.workbook;
  }

  private rows(sheetName: string): string[][] {
    if (this.cache.has(sheetName)) return this.cache.get(sheetName)!;
    const wb = this.load();
    const rows = wb.Sheets[sheetName] ? sheetToMatrix(wb.Sheets[sheetName]) : [];
    this.cache.set(sheetName, rows);
    return rows;
  }

  private save(): void {
    const wb = this.load();
    for (const sheetName of this.dirty) {
      const rows = this.cache.get(sheetName) ?? [];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      if (!wb.Sheets[sheetName]) wb.SheetNames.push(sheetName);
      wb.Sheets[sheetName] = ws;
    }
    this.dirty.clear();
    XLSX.writeFile(wb, this.filePath);
  }

  async getRows(sheetName: string): Promise<string[][]> {
    return this.rows(sheetName);
  }

  async appendValues(sheetName: string, _range: string, values: unknown[][]): Promise<void> {
    const rows = this.rows(sheetName);
    for (const row of values) {
      rows.push((row as unknown[]).map(v => String(v)));
    }
    this.dirty.add(sheetName);
    this.save();
  }

  async updateValues(sheetName: string, range: string, values: unknown[][]): Promise<void> {
    const rows = this.rows(sheetName);
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
    this.dirty.add(sheetName);
    this.save();
  }

  async deleteRow(sheetName: string, rowIndex: number): Promise<void> {
    this.rows(sheetName).splice(rowIndex, 1);
    this.dirty.add(sheetName);
    this.save();
  }
}
