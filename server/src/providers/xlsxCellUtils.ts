import * as XLSX from 'xlsx';

// Converts a column letter (A, B, ..., Z, AA, ...) to a 0-based index
export function colToIndex(col: string): number {
  return col.split('').reduce((acc, c) => acc * 26 + (c.charCodeAt(0) - 64), 0) - 1;
}

// Returns the 0-based { row, col } of the top-left cell of a range string (e.g. "A2:J2" or "E5")
export function parseTopLeft(range: string): { row: number; col: number } {
  const match = range.match(/^([A-Z]+)(\d+)/);
  if (!match) throw new Error(`Cannot parse range: ${range}`);
  return { col: colToIndex(match[1]), row: parseInt(match[2]) - 1 };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Formats a date cell's value as "YYYY-MM-DD HH:MM:SS", read from the Date object's UTC
// components — a fallback for when cell.w can't be trusted (see resolveDateCell below).
function formatDateCell(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ` +
    `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

// Some sheets use a genuinely opaque display label for a date cell (e.g. the summary
// tab's monthLabel, formatted "June2024" — not meant to be reparsed, just shown and
// string-compared). cell.w preserves that correctly and should be trusted whenever it's
// unambiguous. But cell.w depends on the cell's stored number format, and a short format
// like "6/1/24" (2-digit year) is lossy/ambiguous (is "23" 1923 or 2023?) and has been
// observed on real-world xlsx exports where the intended full-datetime format wasn't
// applied — trusting it silently breaks every date parser in sheetMapper.ts. A 4-digit
// year is the simple, reliable signal that cell.w is unambiguous and safe to use as-is;
// without one, fall back to the deterministic UTC-derived value instead.
function resolveDateCell(cell: XLSX.CellObject): string {
  const v = cell.v as Date;
  if (cell.w && /\d{4}/.test(cell.w)) return cell.w;
  return formatDateCell(v);
}

// Converts a single cell to a string that matches what the Google Sheets API returns.
//
// - date (t === 'd')       → cell.w if unambiguous, else a UTC-derived fallback — see resolveDateCell
// - number with % format   → cell.w ("95.5%")
// - plain number           → String(cell.v) ("150", not "$2,000.00") ← key fix vs raw:false
// - boolean                → "TRUE" / "FALSE"
// - string                 → as-is
//
// cellDates: true must be set when reading the workbook so that date cells
// get t === 'd' (Date object) instead of t === 'n' (serial number), allowing
// plain numbers to be detected and returned without formatting.
export function cellToString(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v === undefined || cell.v === null) return '';
  switch (cell.t) {
    case 'b':
      return (cell.v as boolean) ? 'TRUE' : 'FALSE';
    case 's':
      return cell.v as string;
    case 'd':
      return cell.v instanceof Date ? resolveDateCell(cell) : (cell.w ?? '');
    case 'n': {
      // Percentage: cell.z (the number-format string) is only populated by SheetJS when
      // reading with `cellNF: true`, which we don't set — so detect percent formatting
      // from cell.w (the display text, always computed) instead. Returns "95.5%" so
      // parseSheetPercent works correctly; falls through to the raw value otherwise.
      if (cell.w && cell.w.includes('%')) {
        return cell.w;
      }
      // Plain number (amounts, installments, year): return raw value so parseSheetCurrency
      // receives "150" instead of "$2,000.00"
      return String(cell.v);
    }
    case 'z':
      return '';
    default:
      return cell.w ?? String(cell.v);
  }
}

// Converts a WorkSheet to a string[][] using type-aware cell conversion
export function sheetToMatrix(ws: XLSX.WorkSheet): string[][] {
  const ref = ws['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const rows: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      row.push(cellToString(ws[XLSX.utils.encode_cell({ r, c })]));
    }
    rows.push(row);
  }
  return rows;
}
