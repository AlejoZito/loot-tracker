import type { Expense } from '../types';

export interface PendingExpense {
  tempId: string;
  queuedAt: string;
  data: Omit<Expense, 'id'>;
}

const STORAGE_KEY = 'offlineExpenseQueue';

function readQueue(): PendingExpense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingExpense[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function getPendingExpenses(): PendingExpense[] {
  return readQueue();
}

export function addPendingExpense(data: Omit<Expense, 'id'>): PendingExpense {
  const entry: PendingExpense = {
    tempId: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
    data,
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function removePendingExpense(tempId: string): void {
  const queue = readQueue().filter((e) => e.tempId !== tempId);
  writeQueue(queue);
}

export async function flushQueue(
  createFn: (data: Omit<Expense, 'id'>) => Promise<Expense>
): Promise<{ synced: number; failed: number }> {
  const queue = readQueue();
  let synced = 0;

  for (const entry of queue) {
    try {
      await createFn(entry.data);
      removePendingExpense(entry.tempId);
      synced++;
    } catch {
      return { synced, failed: queue.length - synced };
    }
  }

  return { synced, failed: 0 };
}
