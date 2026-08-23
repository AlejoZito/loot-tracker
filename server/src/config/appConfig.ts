import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

/**
 * The app models a two-slot household budget: userA and userB.
 *
 * `id` is the value written into the sheet's `usuario` column and embedded in the JWT.
 * `label` is what the UI displays. Both are configurable; nothing downstream should
 * hardcode either one.
 *
 * The `summary` sheet is a fixed two-person layout (columns A:AB), so the number of
 * slots is part of the spreadsheet contract, not a code limitation.
 *
 * This lives in its own module (not config/env.ts) so that domain code can depend on it
 * without pulling in env.ts's strict `required()` checks for auth/JWT/sheet credentials —
 * those should only run when the server actually boots, not whenever a mapper or domain
 * type is imported (e.g. by a test).
 */
export const budgetUsers = [
  {
    slot: 'userA' as const,
    id: optional('BUDGET_USER_A', 'user-a'),
    label: optional('BUDGET_USER_A_LABEL', 'User A'),
  },
  {
    slot: 'userB' as const,
    id: optional('BUDGET_USER_B', 'user-b'),
    label: optional('BUDGET_USER_B_LABEL', 'User B'),
  },
];

export type BudgetUserSlot = (typeof budgetUsers)[number]['slot'];

/**
 * Which datasource backs the app. Defaults to `xlsx` — a local .xlsx file, seeded from
 * the bundled sample database on first run — so a fresh clone can run immediately with
 * no Google Cloud setup. Set DATA_SOURCE=google-sheets to use a real Google Sheet instead
 * (see quickstart/README.md); that's when GOOGLE_SHEETS_ID becomes required.
 *
 * DATA_SOURCE=db uses Postgres and requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * It derives the summary, category and installment data with SQL views; the sheet modes
 * read those tabs as values computed outside the app.
 */
export const dataSource = (optional('DATA_SOURCE', 'xlsx') as 'xlsx' | 'google-sheets' | 'db');

const REPO_ROOT = path.resolve(__dirname, '../../..');

/** Your local, writable working copy — gitignored, created on first run. */
export const xlsxDataPath = path.resolve(REPO_ROOT, optional('DATA_SOURCE_XLSX_PATH', './server/data/expensesDb.xlsx'));

/** Bundled sample database, copied to xlsxDataPath on first run if that file doesn't exist yet. */
export const xlsxSeedPath = path.resolve(REPO_ROOT, optional('DATA_SOURCE_XLSX_SEED_PATH', './server/resources/sample-sheet-db/expensesDb_mock.xlsx'));
