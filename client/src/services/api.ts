import type { Expense, Category, SummaryMonth, HabitCategory, Habit, HabitMonthSummary, HabitHistoryRow, IncomeCategoryBreakdown, CategoryHistoryRow, InstallmentExpense, AppConfig } from '../types';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    const error = await response.json().catch(() => ({ message: 'Error' }));
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
}

export const api = {
  async login(username: string, password: string): Promise<{ token: string; budgetUser: string }> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  async getExpenses(options?: { limit?: number; offset?: number }): Promise<{
    expenses: Expense[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const url = params.toString()
      ? `${API_BASE}/expenses?${params}`
      : `${API_BASE}/expenses`;

    const response = await fetch(url, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async searchExpenses(q: string, scope: 'last3m' | 'all', category?: string | null): Promise<{
    expenses: Expense[];
    truncated: boolean;
  }> {
    const params = new URLSearchParams({ q, scope });
    if (category) params.set('category', category);
    const response = await fetch(`${API_BASE}/expenses/search?${params}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async createExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const response = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    return handleResponse(response);
  },

  async updateExpense(id: string, expense: Partial<Expense>): Promise<Expense> {
    const response = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    return handleResponse(response);
  },

  async deleteExpense(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete');
    }
  },

  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE}/categories`, {
      headers: getHeaders(),
    });
    const cats = await handleResponse<Category[]>(response);
    try {
      localStorage.setItem('cachedCategories', JSON.stringify(cats));
    } catch { /* quota exceeded — ignore */ }
    return cats;
  },

  async getSummary(month: string): Promise<SummaryMonth> {
    const response = await fetch(`${API_BASE}/summary/${month}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getHabitCategories(): Promise<HabitCategory[]> {
    const response = await fetch(`${API_BASE}/habits-categories`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getHabits(day: string): Promise<Habit[]> {
    const response = await fetch(`${API_BASE}/habits?day=${encodeURIComponent(day)}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getHabitsRecent(days: number): Promise<Habit[]> {
    const response = await fetch(`${API_BASE}/habits?days=${days}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async updateHabit(data: { day: string; categoryId: string; value: boolean }): Promise<Habit> {
    const response = await fetch(`${API_BASE}/habits`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async initDay(day: string): Promise<Habit[]> {
    const response = await fetch(`${API_BASE}/habits/init-day`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ day }),
    });
    return handleResponse(response);
  },

  async getHabitMonthlySummary(month: string): Promise<HabitMonthSummary[]> {
    const response = await fetch(`${API_BASE}/habits/monthly-summary?month=${encodeURIComponent(month)}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getHabitHistory(): Promise<HabitHistoryRow[]> {
    const response = await fetch(`${API_BASE}/habits/history`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getCategoryHistory(): Promise<CategoryHistoryRow[]> {
    const response = await fetch(`${API_BASE}/summary/history`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getSummaryByCategory(month: string, type: 'income' | 'expense'): Promise<IncomeCategoryBreakdown[]> {
    const response = await fetch(`${API_BASE}/summary/by-category/${month}?type=${type}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getConfig(): Promise<AppConfig> {
    const response = await fetch(`${API_BASE}/config`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getInstallmentsByMonth(month: string): Promise<InstallmentExpense[]> {
    const params = new URLSearchParams({ month });
    const response = await fetch(`${API_BASE}/installment-expenses?${params}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getInstallmentsByCategoryAndMonth(category: string, month: string, user?: string): Promise<InstallmentExpense[]> {
    const params = new URLSearchParams({ category, month });
    if (user) params.set('user', user);
    const response = await fetch(`${API_BASE}/installment-expenses?${params}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};
