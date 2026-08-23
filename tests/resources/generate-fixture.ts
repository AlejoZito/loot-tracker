/**
 * Regenerates tests/resources/expenses_db_february2026.xlsx — a small, entirely
 * synthetic fixture workbook used by the repository tests. No real data of any kind;
 * every value here is made up. Run with:
 *   npx tsx tests/resources/generate-fixture.ts
 */
import * as XLSX from 'xlsx';
import * as path from 'path';

const OUT_PATH = path.resolve(__dirname, 'expenses_db_february2026.xlsx');

function sheet(rows: (string | number | boolean)[][]) {
  // Force every cell to a string cell (matches what the real Google Sheets API returns,
  // and what tests/helpers/xlsxSheetProvider.ts's cellToString expects for its 's' branch).
  const stringRows = rows.map(row => row.map(v => String(v)));
  return XLSX.utils.aoa_to_sheet(stringRows);
}

const wb = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(wb, sheet([
  ['id', 'periodo', 'categoria', 'monto', 'cuotas', 'moneda', 'comentario', 'tipo', 'compartido', 'usuario'],
  ['exp-001', '6/5/2024 10:00:00', 'Supermercado', '15000', '1', 'ARS', '', 'Egreso', 'Si', 'user-a'],
  ['exp-002', '6/10/2024 9:30:00', 'Sueldo', '650000', '1', 'ARS', '', 'Ingreso', 'No', 'user-a'],
  ['exp-003', '6/15/2024 18:00:00', 'Supermercado', '8000', '1', 'ARS', '', 'Egreso', 'No', 'user-b'],
  ['exp-004', '6/20/2024 12:00:00', 'Transporte', '3000', '1', 'ARS', 'colectivo', 'Egreso', 'Si', 'user-b'],
]), 'expenses');

XLSX.utils.book_append_sheet(wb, sheet([
  ['id', 'nombre', 'emoji', 'tipo', 'usuario'],
  ['groceries', 'Supermercado', '🛒', 'Egreso', 'shared'],
  ['transport', 'Transporte', '🚌', 'Egreso', 'shared'],
  ['salary', 'Sueldo', '💰', 'Ingreso', 'user-a'],
]), 'expenses-categories');

XLSX.utils.book_append_sheet(wb, sheet([
  ['id', 'nombre', 'emoji', 'default'],
  ['gym', 'Gimnasio', '🏋️', 'FALSE'],
  ['reading', 'Lectura', '📖', 'FALSE'],
]), 'habits-categories');

XLSX.utils.book_append_sheet(wb, sheet([
  ['dia', 'gym', 'reading', 'usuario'],
  ['15/06/2024', 'TRUE', 'FALSE', 'user-a'],
  ['16/06/2024', 'FALSE', 'TRUE', 'user-a'],
  ['15/06/2024', 'TRUE', 'TRUE', 'user-b'],
]), 'habits');

// summary: 3 header/label rows, then one data row per month. Column layout documented in
// the comment above rowToSummaryMonth() in server/src/mappers/sheetMapper.ts.
XLSX.utils.book_append_sheet(wb, sheet([
  ['', '', 'Gastos individuales', '', 'Gastos compartidos', '', '', '% compartido', '', 'Gastos totales', '', 'Ingresos individuales', '', 'Ingresos compartidos', '', '% ingresos', '', '', 'Ingresos totales', '', 'Ahorro', '', '', '% ahorro', '', '', 'Saldo', ''],
  ['', 'Mes', 'userA', 'userB', 'userA', 'userB', 'total', 'userA', 'userB', 'userA', 'userB', 'userA', 'userB', 'userA', 'userB', 'userA', 'userB', 'total', 'userA', 'userB', 'userA', 'userB', 'hogar', 'userA', 'userB', 'hogar', 'aToB', 'bToA'],
  ['year', 'label', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ['2024', 'June2024', '$50000', '$60000', '$20000', '$25000', '$45000', '44%', '56%', '$70000', '$85000', '$360000', '$260000', '$9000', '$21000', '30%', '70%', '$30000', '$369000', '$281000', '$100000', '$95000', '$195000', '33%', '32%', '33%', '$5000', '$0'],
]), 'summary');

XLSX.utils.book_append_sheet(wb, sheet([
  ['categoria', 'tipo', 'usuario', 'compartido', 'periodo', 'monto'],
  ['Supermercado', 'Egreso', 'user-a', 'Si', '2024-06', '$20000'],
  ['Sueldo', 'Ingreso', 'user-a', 'No', '2024-06', '$450000'],
  ['Supermercado', 'Egreso', 'user-b', 'No', '2024-06', '$8000'],
]), 'summary_by_categories');

XLSX.writeFile(wb, OUT_PATH);
console.log(`Wrote synthetic fixture to ${OUT_PATH}`);
