import type { SupabaseClient } from '@supabase/supabase-js';
import { selectAll } from '../../providers/dbClient';
import { rowToExpense, expenseToRow, dateTimeToDb, EXPENSE_COLUMNS, type ExpenseRow } from '../../mappers/dbMapper';
import type { IExpenseRepository } from '../IExpenseRepository';
import type { IAppSettingsRepository } from '../IAppSettingsRepository';
import { Expense } from '../../domain/expense';

/** Map a Partial<Expense> to a partial row, including only the keys actually provided. */
function updatesToRow(updates: Partial<Expense>, timezone: string): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (updates.date !== undefined) row.occurred_at = dateTimeToDb(updates.date, timezone);
  if (updates.category !== undefined) row.category = updates.category;
  if (updates.amount !== undefined) row.amount = updates.amount;
  if (updates.installments !== undefined) row.installments = updates.installments;
  if (updates.currency !== undefined) row.currency = updates.currency;
  if (updates.notes !== undefined) row.notes = updates.notes;
  if (updates.type !== undefined) row.type = updates.type;
  if (updates.shared !== undefined) row.shared = updates.shared;
  if (updates.user !== undefined) row.user_id = updates.user;
  return row;
}

export class DbExpenseRepository implements IExpenseRepository {
  private timezone: string | null = null;

  constructor(
    private readonly db: SupabaseClient,
    private readonly settings: IAppSettingsRepository,
  ) {}

  /** Writes need the household zone to resolve a wall clock into an instant. */
  private async zone(): Promise<string> {
    if (this.timezone === null) this.timezone = (await this.settings.get()).timezone;
    return this.timezone;
  }

  async getAll(): Promise<Expense[]> {
    const rows = await selectAll<ExpenseRow>(() =>
      this.db.from('expenses').select(EXPENSE_COLUMNS)
        .order('occurred_at', { ascending: true })
        .order('id', { ascending: true }),
    );
    return rows.map(rowToExpense);
  }

  async create(expense: Omit<Expense, 'id'> & { id?: string }): Promise<Expense> {
    const row = expenseToRow(expense as Expense, await this.zone());
    if (!row.id) delete row.id;

    const { data, error } = await this.db.from('expenses').insert(row).select(EXPENSE_COLUMNS).single();
    if (error) throw new Error(`Failed to create expense: ${error.message}`);
    return rowToExpense(data as ExpenseRow);
  }

  async update(id: string, updates: Partial<Expense>): Promise<Expense | null> {
    const row = updatesToRow(updates, await this.zone());
    row.updated_at = new Date().toISOString();

    const { data, error } = await this.db
      .from('expenses').update(row).eq('id', id).select(EXPENSE_COLUMNS).maybeSingle();
    if (error) throw new Error(`Failed to update expense ${id}: ${error.message}`);
    if (!data) return null;
    return rowToExpense(data as ExpenseRow);
  }

  async delete(id: string): Promise<boolean> {
    // Without `.select()` a delete of a missing id is indistinguishable from a real one.
    const { data, error } = await this.db.from('expenses').delete().eq('id', id).select('id');
    if (error) throw new Error(`Failed to delete expense ${id}: ${error.message}`);
    return Array.isArray(data) && data.length > 0;
  }
}
