import { useState, useEffect, useRef } from 'react';
import { useDialogNPC } from '../../dialog-npc-temp';
import { pickDialog } from '../../dialog/dialogs';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { addPendingExpense, flushQueue } from '../../services/offlineQueue';
import type { Category, Currency, TransactionType } from '../../types';
import { Card } from '../../components/primitives/Card/Card';
import { useBudgetConfig } from '../../context/BudgetConfigContext';
import { CategoryIcon } from './CategoryIcon';

interface AddExpenseFormProps {
  id?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function AddExpenseForm({ id, onSuccess, onCancel }: AddExpenseFormProps) {
  const isEditing = Boolean(id);
  const npc = useDialogNPC();
  const isOnline = useOnlineStatus();
  const { config } = useBudgetConfig();
  const defaultUserId = config.users[0]?.id ?? '';

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [offlineQueued, setOfflineQueued] = useState(false);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(config.defaultExpenseCurrency);
  // Once the user picks a currency we stop syncing it from config below.
  const currencyTouched = useRef(false);
  const [category, setCategory] = useState<string | null>(null);
  const [isIncome, setIsIncome] = useState(false);
  const [installments, setInstallments] = useState('');
  const [notes, setNotes] = useState('');
  const [isShared, setIsShared] = useState(true);
  const [user, setUser] = useState(() => localStorage.getItem('budgetUser') || defaultUserId);
  const [expenseDate, setExpenseDate] = useState('');

  // The useState above can only read the fallback config; /api/config resolves later.
  // Adopting it must not clobber a user's pick or an edited expense's own currency.
  useEffect(() => {
    if (isEditing || currencyTouched.current) return;
    setCurrency(config.defaultExpenseCurrency);
  }, [config.defaultExpenseCurrency, isEditing]);

  const [animationState, setAnimationState] = useState<'idle' | 'collapsing' | 'expanding'>('idle');
  const [displayedType, setDisplayedType] = useState<TransactionType>('expense');
  const pendingTypeRef = useRef<TransactionType | null>(null);

  const filteredCategories = allCategories.filter(
    (cat) => cat.type === displayedType && (cat.user === 'shared' || cat.user === user)
  );
  const categoriesToShow = filteredCategories.length > 0 ? filteredCategories : allCategories;

  useEffect(() => {
    const loadData = async () => {
      try {
        const cats = await api.getCategories();
        setAllCategories(cats);

        if (isEditing && id) {
          const { expenses } = await api.getExpenses();
          const expense = expenses.find((e) => e.id === id);
          if (expense) {
            setAmount(String(expense.amount));
            setCurrency(expense.currency);
            setCategory(expense.category);
            setIsIncome(expense.type === 'income');
            setDisplayedType(expense.type);
            setInstallments(String(expense.installments));
            setNotes(expense.notes);
            setIsShared(expense.shared);
            setUser(expense.user || defaultUserId);
            setExpenseDate(expense.date);
          }
        }
      } catch {
        try {
          const cached = localStorage.getItem('cachedCategories');
          if (cached) {
            setAllCategories(JSON.parse(cached));
          } else {
            setError('Error al cargar datos');
          }
        } catch {
          setError('Error al cargar datos');
        }
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [id, isEditing]);

  const handleTypeChange = (newIsIncome: boolean) => {
    const newType: TransactionType = newIsIncome ? 'income' : 'expense';
    if (newType === displayedType) return;
    setIsIncome(newIsIncome);
    setCategory(null);
    pendingTypeRef.current = newType;
    setAnimationState('collapsing');
  };

  const handleAnimationEnd = () => {
    if (animationState === 'collapsing' && pendingTypeRef.current) {
      setDisplayedType(pendingTypeRef.current);
      pendingTypeRef.current = null;
      setAnimationState('expanding');
    } else if (animationState === 'expanding') {
      setAnimationState('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      setError('Selecciona una categoria');
      return;
    }
    setError('');
    setLoading(true);

    const now = new Date();
    const date = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const expenseData = {
      date,
      category,
      amount: Number(amount),
      installments: installments ? parseInt(installments) : 1,
      currency,
      notes,
      type: isIncome ? 'income' as const : 'expense' as const,
      shared: isShared,
      user,
    };

    try {
      if (isEditing && id) {
        await api.updateExpense(id, expenseData);
        onSuccess();
      } else if (isOnline) {
        await flushQueue(api.createExpense.bind(api));
        await api.createExpense(expenseData);
        const categoryId = allCategories.find(c => c.name === category)?.id ?? null;
        npc.show(pickDialog(categoryId, isIncome ? 'income' : 'expense'));
        onSuccess();
      } else {
        addPendingExpense(expenseData);
        setOfflineQueued(true);
        setTimeout(() => onSuccess(), 1200);
      }
    } catch {
      if (!navigator.onLine) {
        addPendingExpense(expenseData);
        setOfflineQueued(true);
        setTimeout(() => onSuccess(), 1200);
      } else {
        setError('Error al guardar');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="transaction-form-loading flex justify-center items-center h-64">
        <div className="page-title">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="transaction-form-page page-bg flex flex-col">
      <div className="transaction-form-container content-panel">
        <Card>
          <form id="transaction-form" onSubmit={handleSubmit} className="transaction-form panel-inner">
            {isEditing && expenseDate && (
              <div className="text-center mb-2">
                <span className="helper-text text-lg">{(() => {
                  const [datePart, timePart] = expenseDate.split(' ');
                  const time = timePart ? timePart.split(':').slice(0, 2).join(':') : '';
                  return time ? `${datePart} ${time}` : datePart;
                })()}</span>
              </div>
            )}

            <fieldset className="transaction-top-row flex gap-2">
              <div className="transaction-type-toggle toggle-container flex-1">
                <button
                  type="button"
                  onClick={() => handleTypeChange(false)}
                  className={cn(
                    'transaction-type-btn transaction-type-btn--expense toggle-btn flex-1',
                    !isIncome && 'toggle-btn-active toggle-btn-expense'
                  )}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange(true)}
                  className={cn(
                    'transaction-type-btn transaction-type-btn--income toggle-btn flex-1',
                    isIncome && 'toggle-btn-active toggle-btn-income'
                  )}
                >
                  Ingreso
                </button>
              </div>
            </fieldset>

            <fieldset className="transaction-top-row flex gap-2">
              <div className="shared-toggle-group toggle-container flex-1">
                <button
                  type="button"
                  onClick={() => setIsShared(false)}
                  className={cn(
                    'shared-type-btn toggle-btn flex-1',
                    !isShared && 'toggle-btn-active toggle-btn-shared-own'
                  )}
                >
                  Propio
                </button>
                <button
                  type="button"
                  onClick={() => setIsShared(true)}
                  className={cn(
                    'shared-type-btn toggle-btn flex-1',
                    isShared && 'toggle-btn-active toggle-btn-shared'
                  )}
                >
                  Compartido
                </button>
              </div>
            </fieldset>

            <fieldset className="amount-field space-y-1.5">
              <label className="amount-label field-label">Monto</label>
              <div className="amount-input-group flex gap-2">
                <div className="amount-input-wrapper relative flex-1">
                  <span className="amount-currency-symbol currency-prefix">
                    {config.availableCurrencies.find((c) => c.code === currency)?.symbol ?? currency}
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="amount-input input-field input-field-lg"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const increment = currency === 'ARS' ? 2000 : 10;
                    setAmount(String(Math.max(0, (parseFloat(amount) || 0) - increment)));
                  }}
                  className="amount-decrement-btn btn w-12 h-12 text-xl font-bold"
                >-</button>
                <button
                  type="button"
                  onClick={() => {
                    const increment = currency === 'ARS' ? 2000 : 10;
                    setAmount(String((parseFloat(amount) || 0) + increment));
                  }}
                  className="amount-increment-btn btn w-12 h-12 text-xl font-bold"
                >+</button>
              </div>
            </fieldset>

            <fieldset className="currency-field space-y-1.5">
              <label className="currency-label field-label">Moneda</label>
              <div className={cn('currency-options grid gap-3', config.availableCurrencies.length > 3 ? 'grid-cols-4' : 'grid-cols-3')}>
                {config.availableCurrencies.map(({ code }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => { currencyTouched.current = true; setCurrency(code); }}
                    className={cn('currency-option-btn btn h-11', currency === code && 'currency-option-btn--selected btn-selected')}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="category-field space-y-1.5">
              <label className="category-label field-label">Categoria</label>
              <div
                className={cn(
                  'category-grid grid grid-cols-5 gap-2',
                  animationState === 'collapsing' && 'category-grid--collapsing',
                  animationState === 'expanding' && 'category-grid--expanding'
                )}
                onAnimationEnd={handleAnimationEnd}
              >
                {categoriesToShow.map((cat, index) => {
                  const isSelected = category === cat.name;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.name)}
                      className={cn('category-option category-btn', isSelected && 'category-option--selected category-btn-selected')}
                      style={{ '--card-index': index } as React.CSSProperties}
                    >
                      <CategoryIcon
                        categoryId={cat.id}
                        emoji={cat.emoji}
                        name={cat.name}
                        className="category-option-icon category-icon"
                      />
                      <span className="category-option-label category-label">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="installments-field space-y-1.5">
              <label className="installments-label field-label">Cuotas</label>
              <div className="installments-input-group flex gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="installments-input input-field flex-1"
                />
                <button type="button" onClick={() => setInstallments(String(Math.max(1, (parseInt(installments) || 1) - 1)))} className="installments-decrement-btn btn w-12 h-12 text-xl font-bold">-</button>
                <button type="button" onClick={() => setInstallments(String((parseInt(installments) || 1) + 1))} className="installments-increment-btn btn w-12 h-12 text-xl font-bold">+</button>
              </div>
              <p className="installments-helper helper-text">Dejar vacio o 1 para pago unico</p>
            </fieldset>

            <fieldset className="user-field space-y-1.5">
              <label className="user-label field-label">Usuario</label>
              <div className="user-options grid grid-cols-2 gap-3">
                {config.users.map(({ id: u, label }) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setUser(u);
                      if (category) {
                        const cat = allCategories.find(c => c.name === category);
                        if (cat && cat.user !== 'shared' && cat.user !== u) setCategory(null);
                      }
                    }}
                    className={cn('user-option-btn btn h-11 capitalize', user === u && 'user-option-btn--selected btn-selected')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="notes-field space-y-1.5">
              <label className="notes-label field-label">Notas</label>
              <textarea
                placeholder="Agregar una nota..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="notes-input input-field textarea-field"
              />
            </fieldset>

            {error && (
              <p className="transaction-form-error text-center" style={{ color: 'var(--destructive)' }}>{error}</p>
            )}
            {offlineQueued && (
              <p className="transaction-form-success text-center" style={{ color: 'var(--accent)' }}>Guardado localmente</p>
            )}
          </form>
        </Card>
      </div>

      <div className="transaction-form-submit-wrapper">
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn flex-1">
              Cancelar
            </button>
          )}
          <button
            type="submit"
            form="transaction-form"
            disabled={loading}
            className={cn('transaction-form-submit btn submit-btn flex-1', isIncome ? 'btn-success' : 'btn-danger')}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
