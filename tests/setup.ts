// Dummy values so importing server/src/config/env.ts (transitively pulled in by anything
// that imports GoogleSheetProvider) doesn't throw during unit tests. These are never used
// to make a real request — repository/mapper tests exercise pure functions or the
// XlsxSheetProvider test fixture, not the real Google Sheets API.
process.env.AUTH_USERNAME_A ??= 'test-user-a';
process.env.AUTH_PASSWORD_A ??= 'test-password-a';
process.env.AUTH_USERNAME_B ??= 'test-user-b';
process.env.AUTH_PASSWORD_B ??= 'test-password-b';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.GOOGLE_SHEETS_ID ??= 'test-spreadsheet-id';
