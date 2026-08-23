import { google } from 'googleapis';
import { config } from '../config/env';
import path from 'path';
import type { ISheetProvider } from './ISheetProvider';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export class GoogleSheetProvider implements ISheetProvider {
  constructor(private spreadsheetId: string = config.googleSheets.spreadsheetId) {}

  private async getAuthClient() {
    if (config.googleSheets.credentialsJson) {
      const credentials = JSON.parse(config.googleSheets.credentialsJson);
      const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
      return auth.getClient();
    }

    const credentialsPath = path.resolve(__dirname, '../../..', config.googleSheets.credentialsPath);
    const auth = new google.auth.GoogleAuth({ keyFile: credentialsPath, scopes: SCOPES });
    return auth.getClient();
  }

  private async getSheetsClient() {
    const authClient = await this.getAuthClient();
    return google.sheets({ version: 'v4', auth: authClient as any });
  }

  async getRows(sheetName: string, range: string): Promise<string[][]> {
    const sheets = await this.getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!${range}`,
    });
    return (response.data.values as string[][] | null) || [];
  }

  async appendValues(sheetName: string, range: string, values: unknown[][]): Promise<void> {
    const sheets = await this.getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  async updateValues(sheetName: string, range: string, values: unknown[][]): Promise<void> {
    const sheets = await this.getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  async deleteRow(sheetName: string, rowIndex: number): Promise<void> {
    const sheets = await this.getSheetsClient();

    const sheetResponse = await sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });

    const sheet = sheetResponse.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    if (!sheet?.properties?.sheetId) {
      throw new Error(`Sheet "${sheetName}" not found or has no sheetId`);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      },
    });
  }
}
