import { v4 as uuidv4 } from 'uuid';
import type { ISheetProvider } from '../../providers/ISheetProvider';
import { sheetProvider } from '../../providers/sheetProvider';
import { rowToExpense, expenseToRow, isBlankRow, SHEET_RANGES } from '../../mappers/sheetMapper';
import type { IExpenseRepository } from '../IExpenseRepository';
import { Expense } from '../../domain/expense';

export class SheetExpenseRepository implements IExpenseRepository {
  constructor(private readonly provider: ISheetProvider) {}

  async getAll(): Promise<Expense[]> {
    const rows = await this.provider.getRows('expenses', SHEET_RANGES.expenses);
    if (rows.length <= 1) return [];
    return rows.slice(1).filter(r => !isBlankRow(r)).map(rowToExpense);
  }

  async create(expense: Omit<Expense, 'id'> & { id?: string }): Promise<Expense> {
    const id = expense.id ?? uuidv4().slice(0, 8);
    const newExpense = new Expense(
      id, expense.date, expense.category, expense.amount, expense.installments,
      expense.currency, expense.notes, expense.type, expense.shared, expense.user || '',
    );
    await this.provider.appendValues('expenses', SHEET_RANGES.expenses, [expenseToRow(newExpense)]);
    return newExpense;
  }

  async update(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    const rows = await this.provider.getRows('expenses', SHEET_RANGES.expenses);
    if (!rows) return null;

    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return null;

    const current = rowToExpense(rows[rowIndex]);
    const updatedExpense = new Expense(
      current.id,
      updates.date ?? current.date,
      updates.category ?? current.category,
      updates.amount ?? current.amount,
      updates.installments ?? current.installments,
      updates.currency ?? current.currency,
      updates.notes ?? current.notes,
      updates.type ?? current.type,
      updates.shared ?? current.shared,
      updates.user ?? current.user,
    );

    await this.provider.updateValues(
      'expenses',
      `A${rowIndex + 1}:J${rowIndex + 1}`,
      [expenseToRow(updatedExpense)],
    );

    return updatedExpense;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.provider.getRows('expenses', SHEET_RANGES.expenses);
    if (!rows) return false;

    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return false;

    await this.provider.deleteRow('expenses', rowIndex);
    return true;
  }
}

export const expenseRepository = new SheetExpenseRepository(sheetProvider);
