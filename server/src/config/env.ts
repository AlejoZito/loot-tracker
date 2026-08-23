import dotenv from 'dotenv';
import path from 'path';
import { budgetUsers, dataSource } from './appConfig';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
      `Copy .env.example to .env and fill it in — see quickstart/README.md.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export { budgetUsers, dataSource, xlsxDataPath, xlsxSeedPath } from './appConfig';
export type { BudgetUserSlot } from './appConfig';

export const config = {
  port: process.env.PORT || 3000,
  auth: {
    users: [
      {
        username: required('AUTH_USERNAME_A'),
        password: required('AUTH_PASSWORD_A'),
        budgetUser: budgetUsers[0].id,
      },
      {
        username: required('AUTH_USERNAME_B'),
        password: required('AUTH_PASSWORD_B'),
        budgetUser: budgetUsers[1].id,
      },
    ],
    jwtSecret: required('JWT_SECRET'),
  },
  supabase: {
    // Validated at boot so a misconfigured deploy fails with a clear message rather
    // than on the first request that touches the database.
    url: dataSource === 'db' ? required('SUPABASE_URL') : optional('SUPABASE_URL', ''),
    serviceRoleKey: dataSource === 'db'
      ? required('SUPABASE_SERVICE_ROLE_KEY')
      : optional('SUPABASE_SERVICE_ROLE_KEY', ''),
  },
  googleSheets: {
    // Only required when DATA_SOURCE=google-sheets — the default DATA_SOURCE=xlsx doesn't
    // touch Google Sheets at all, so it shouldn't force you to have a spreadsheet ready.
    spreadsheetId: dataSource === 'google-sheets' ? required('GOOGLE_SHEETS_ID') : optional('GOOGLE_SHEETS_ID', ''),
    credentialsPath: optional('GOOGLE_CREDENTIALS_PATH', './server/credentials.json'),
    // For Vercel: JSON string of service account credentials
    credentialsJson: optional('GOOGLE_CREDENTIALS_JSON', ''),
    expensesSheetName: optional('EXPENSES_SHEET_NAME', 'expenses'),
    categoriesSheetName: optional('CATEGORIES_SHEET_NAME', 'expenses-categories'),
    habitsSheetName: optional('HABITS_SHEET_NAME', 'habits'),
    habitsCategoriesSheetName: optional('HABITS_CATEGORIES_SHEET_NAME', 'habits-categories'),
    summarySheetName: optional('SUMMARY_SHEET_NAME', 'summary'),
    summaryByCategoriesSheetName: optional('SUMMARY_BY_CATEGORIES_SHEET_NAME', 'summary_by_categories'),
  },
};
