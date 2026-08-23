import { installmentRepository } from '../repositories/sheet/SheetInstallmentRepository';
import type { InstallmentExpense } from '../domain/installmentExpense';

export async function getInstallmentsByCategory(category: string, user?: string): Promise<InstallmentExpense[]> {
  return installmentRepository.getByCategory(category, user);
}

export async function getInstallmentsByMonth(month: string, user?: string): Promise<InstallmentExpense[]> {
  return installmentRepository.getByMonth(month, user);
}

export async function getInstallmentsByCategoryAndMonth(category: string, month: string, user?: string): Promise<InstallmentExpense[]> {
  return installmentRepository.getByMonthAndCategory(month, category, user);
}
