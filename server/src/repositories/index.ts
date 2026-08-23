import { dataSource } from '../config/appConfig';
import { getDb } from '../providers/dbClient';

import type { IExpenseRepository } from './IExpenseRepository';
import type { ICategoryRepository } from './ICategoryRepository';
import type { IHabitRepository } from './IHabitRepository';
import type { ISummaryRepository } from './ISummaryRepository';
import type { IInstallmentRepository } from './IInstallmentRepository';
import type { IAppSettingsRepository } from './IAppSettingsRepository';
import { DefaultAppSettingsRepository } from './DefaultAppSettingsRepository';
import { DbAppSettingsRepository } from './db/DbAppSettingsRepository';

import { expenseRepository as sheetExpenses } from './sheet/SheetExpenseRepository';
import { categoryRepository as sheetCategories } from './sheet/SheetCategoryRepository';
import { habitRepository as sheetHabits } from './sheet/SheetHabitRepository';
import { summaryRepository as sheetSummary } from './sheet/SheetSummaryRepository';
import { installmentRepository as sheetInstallments } from './sheet/SheetInstallmentRepository';

import { DbExpenseRepository } from './db/DbExpenseRepository';
import { DbCategoryRepository } from './db/DbCategoryRepository';
import { DbHabitRepository } from './db/DbHabitRepository';
import { DbSummaryRepository } from './db/DbSummaryRepository';
import { DbInstallmentRepository } from './db/DbInstallmentRepository';

/**
 * The composition root: the one place that decides which datasource backs the app.
 * Usecases import repositories from here and see only the interfaces.
 *
 * `getDb()` must stay inside the `db` branch — calling it eagerly would require Supabase
 * configuration for the xlsx and google-sheets paths, and for unit tests.
 */
const useDb = dataSource === 'db';
const db = useDb ? getDb() : null;

export const expenseRepository: IExpenseRepository =
  db ? new DbExpenseRepository(db) : sheetExpenses;

export const categoryRepository: ICategoryRepository =
  db ? new DbCategoryRepository(db) : sheetCategories;

export const habitRepository: IHabitRepository =
  db ? new DbHabitRepository(db) : sheetHabits;

export const summaryRepository: ISummaryRepository =
  db ? new DbSummaryRepository(db) : sheetSummary;

export const installmentRepository: IInstallmentRepository =
  db ? new DbInstallmentRepository(db) : sheetInstallments;

/** Sheet backends have nowhere to store settings, so they get frozen historical defaults. */
export const appSettingsRepository: IAppSettingsRepository =
  db ? new DbAppSettingsRepository(db) : new DefaultAppSettingsRepository();
