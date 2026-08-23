import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { AppConfig } from '../types';

// Serves until GET /api/config resolves, and stands if it fails. Keep in sync with
// DefaultAppSettingsRepository on the server.
const FALLBACK_CONFIG: AppConfig = {
  users: [
    { slot: 'userA', id: 'user-a', label: 'User A' },
    { slot: 'userB', id: 'user-b', label: 'User B' },
  ],
  mainCurrency: 'USD',
  defaultExpenseCurrency: 'ARS',
  locale: 'es-AR',
  currencies: [
    { code: 'ARS', name: 'Argentine Peso', symbol: '$', decimalPlaces: 2 },
    { code: 'USD', name: 'US Dollar', symbol: 'US$', decimalPlaces: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
  ],
};

interface BudgetConfigContextValue {
  config: AppConfig;
  loading: boolean;
  /** Display label for a budget-user id (falls back to the id itself if unknown). */
  labelForUser: (id: string) => string;
  /** Single-letter initial for a budget-user id, for compact badges. */
  initialForUser: (id: string) => string;
  /** Which of the two household slots a budget-user id belongs to (defaults to userA if unknown). */
  slotForUser: (id?: string | null) => 'userA' | 'userB';
  /** Display label for a household slot. */
  labelForSlot: (slot: 'userA' | 'userB') => string;
  /** Display symbol for a currency code (falls back to the code itself if unknown). */
  currencySymbol: (code: string) => string;
}

const BudgetConfigContext = createContext<BudgetConfigContextValue | null>(null);

export function BudgetConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(FALLBACK_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getConfig()
      .then((cfg) => { if (!cancelled) setConfig(cfg); })
      .catch(() => { /* keep fallback config */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const labelForUser = (id: string) => config.users.find(u => u.id === id)?.label || id;
  const initialForUser = (id: string) => labelForUser(id).charAt(0).toUpperCase() || '?';
  const slotForUser = (id?: string | null) => config.users.find(u => u.id === id)?.slot ?? 'userA';
  const labelForSlot = (slot: 'userA' | 'userB') => config.users.find(u => u.slot === slot)?.label || slot;
  const currencySymbol = (code: string) => config.currencies.find(c => c.code === code)?.symbol || code;

  return (
    <BudgetConfigContext.Provider value={{ config, loading, labelForUser, initialForUser, slotForUser, labelForSlot, currencySymbol }}>
      {children}
    </BudgetConfigContext.Provider>
  );
}

export function useBudgetConfig(): BudgetConfigContextValue {
  const ctx = useContext(BudgetConfigContext);
  if (!ctx) throw new Error('useBudgetConfig must be used within a BudgetConfigProvider');
  return ctx;
}
