import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Expense } from '../../types';
import { useRightSlot } from '../../context/RightSlotContext';
import { useBudgetConfig } from '../../context/BudgetConfigContext';
import { useViewport } from '../../hooks/useViewport';
import { PAGE_SIZE, MONTHS_ES } from './constants';
import { slotForUser, labelForSlot } from './utils';
import { PayerBadge } from './components/PayerBadge';
import { CatIconTile } from './components/CatIconTile';
import { GroupBanner } from './components/GroupBanner';
import { FilterTab } from './components/FilterTab';
import { SwipeableRow } from './components/SwipeableRow';
import { SkeletonPlanks } from './components/SkeletonPlanks';
import { EmptyState } from './components/EmptyState';
import { SearchBar } from './components/SearchBar';
import { SearchScopeToggle } from './components/SearchScopeToggle';
import { SearchCategoryFilter } from './components/SearchCategoryFilter';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'mine' | 'other';
// 'last-week' = last 7 days excluding today/yesterday
// string (YYYY-MM) = older month bucket
type GroupKey = 'today' | 'yesterday' | 'last-week' | string;

interface ExpenseListProps {
  budgetUser?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * today/yesterday: exact ISO match.
 * last-week: within 7 rolling days before yesterday.
 * YYYY-MM: anything older — groups by calendar month.
 */
function dateGroupKey(iso: string, todayIso: string): GroupKey {
  const todayMs = new Date(todayIso).getTime();
  const dateMs = new Date(iso.slice(0, 10)).getTime();
  const diffDays = Math.round((todayMs - dateMs) / 86_400_000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return 'last-week';
  return iso.slice(0, 7); // YYYY-MM
}

function groupLabel(key: GroupKey): string {
  if (key === 'today') return 'HOY';
  if (key === 'yesterday') return 'AYER';
  if (key === 'last-week') return 'ESTA SEMANA';
  const [year, month] = key.split('-');
  return `${MONTHS_ES[parseInt(month, 10) - 1]} '${year.slice(2)}`;
}

function groupByPeriod(expenses: Expense[], todayIso: string): [GroupKey, Expense[]][] {
  const map = new Map<GroupKey, Expense[]>();
  const order: GroupKey[] = [];

  for (const e of expenses) {
    const key = dateGroupKey(e.date.slice(0, 10), todayIso);
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(e);
  }

  const PRIORITY: Record<string, number> = { today: 0, yesterday: 1, 'last-week': 2 };
  order.sort((a, b) => {
    const pa = PRIORITY[a] ?? 3;
    const pb = PRIORITY[b] ?? 3;
    if (pa !== pb) return pa - pb;
    return b.localeCompare(a); // desc for YYYY-MM
  });

  return order.map((key) => [key, map.get(key)!]);
}

function expensePrimaryText(e: Expense): string {
  return e.notes?.trim() || e.category;
}

function formatDayMonth(date: string): string {
  const [, month, day] = date.slice(0, 10).split('-');
  return `${day}/${month}`;
}

function expenseSecondaryText(e: Expense): string {
  const date = formatDayMonth(e.date);
  return e.notes?.trim() ? `${e.category} · ${date}` : date;
}

function fmtAmount(amount: number, type: string, currency: string): string {
  const sign = type === 'income' ? '+' : '-';
  const symbol = ({ USD: 'U$', EUR: '€', ARS: '$' } as Record<string, string>)[currency] ?? '$';
  return `${sign}${symbol}${amount.toLocaleString('es-AR')}`;
}

function dedupeById(expenses: Expense[]): Expense[] {
  const seen = new Set<string>();
  return expenses.filter((e) => {
    if (!e.id || seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExpenseList({ budgetUser }: ExpenseListProps) {
  const navigate = useNavigate();
  const { refreshCount, openDrawer } = useRightSlot();
  const { config } = useBudgetConfig();
  const viewport = useViewport(); // used for desktop "+" button
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoryEmojiMap, setCategoryEmojiMap] = useState<Record<string, string>>({});
  const [categoryNames, setCategoryNames] = useState<string[]>([]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'last3m' | 'all'>('last3m');
  const [searchCategory, setSearchCategory] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Expense[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTruncated, setSearchTruncated] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const expensesRef = useRef<Expense[]>([]);
  const searchReqIdRef = useRef(0);

  const loadExpenses = async (reset = false) => {
    if (!reset && loadingMoreRef.current) return;
    try {
      if (reset) {
        setLoading(true);
        setExpenses([]);
        expensesRef.current = [];
      } else {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }

      const offset = reset ? 0 : expensesRef.current.length;
      const data = await api.getExpenses({ limit: PAGE_SIZE, offset });
      const newExpenses = data?.expenses ?? [];

      if (reset) {
        setExpenses(newExpenses);
        expensesRef.current = newExpenses;
      } else {
        setExpenses((prev) => {
          const updated = [...(prev ?? []), ...newExpenses];
          expensesRef.current = updated;
          return updated;
        });
      }
      setHasMore(data?.hasMore ?? false);
      hasMoreRef.current = data?.hasMore ?? false;
    } catch (err) {
      console.error('[ExpenseList] Error loading expenses:', err);
      setError('Error al cargar gastos');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadExpenses(true);
    api.getCategories().then((cats) => {
      const map: Record<string, string> = {};
      cats.forEach((c) => { map[c.name] = c.emoji; });
      setCategoryEmojiMap(map);
      setCategoryNames(cats.map((c) => c.name));
    }).catch(() => {});
  }, [refreshCount]);

  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          loadExpenses(false);
        }
      });
      observerRef.current.observe(node);
    },
    []
  );

  useEffect(() => {
    const trimmed = searchQuery.trim();
    const hasQuery = trimmed.length >= 3;
    const hasCategory = searchCategory != null;
    if (!hasQuery && !hasCategory) {
      searchReqIdRef.current++;
      setSearchResults(null);
      setSearchLoading(false);
      setSearchTruncated(false);
      return;
    }
    const id = ++searchReqIdRef.current;
    setSearchLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await api.searchExpenses(trimmed, searchScope, searchCategory);
        if (id !== searchReqIdRef.current) return;
        setSearchResults(data.expenses);
        setSearchTruncated(data.truncated);
      } catch (err) {
        if (id !== searchReqIdRef.current) return;
        console.error('[ExpenseList] Search error:', err);
        setError('Error al buscar');
      } finally {
        if (id === searchReqIdRef.current) setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchScope, searchCategory]);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteExpense(id);
      setExpenses((prev) => (prev ?? []).filter((e) => e.id !== id));
      setSearchResults((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
    } catch {
      setError('Error al eliminar');
    } finally {
      setDeleteId(null);
      setSwipedId(null);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '/' && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'n') {
        openDrawer();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchOpen, openDrawer]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchCategory(null);
    searchReqIdRef.current++;
    setSearchResults(null);
    setSearchLoading(false);
    setSearchTruncated(false);
  };

  const closeSwipe = () => setSwipedId(null);

  const togglePlank = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setSwipedId((prev) => (prev === id ? null : id));
  };

  // Derived values
  const meSlot = slotForUser(budgetUser, config);
  const otherSlot: 'userA' | 'userB' = meSlot === 'userA' ? 'userB' : 'userA';
  const otherLabel = labelForSlot(otherSlot, config);
  const todayIso = new Date().toISOString().slice(0, 10);

  const safeExpenses = dedupeById(expenses ?? []);

  const inSearchMode = searchResults != null;
  const sourceExpenses: Expense[] = inSearchMode ? searchResults! : safeExpenses;

  const filteredExpenses = sourceExpenses.filter((expense) => {
    if (searchCategory != null && expense.category !== searchCategory) return false;
    if (filterMode === 'mine') return expense.user === budgetUser;
    if (filterMode === 'other') return expense.user !== budgetUser && expense.user != null;
    return true; // 'all': every expense regardless of user or shared flag
  });

  const periodGroups = groupByPeriod(filteredExpenses, todayIso);

  if (error && safeExpenses.length === 0) {
    return (
      <div className="expense-list-page page-bg">
        <div className="expense-list-error text-center p-4">
          <p className="page-title">{error}</p>
          <button onClick={() => loadExpenses(true)} className="btn mt-4">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-list-page page-bg" onClick={closeSwipe}>

      {/* Sticky header */}
      <div className="expense-list-header-bar">
        <div className="expense-filter-row">
          <div className="expense-filter-tabs">
            <FilterTab
              label="TODOS"
              active={filterMode === 'all'}
              onClick={() => setFilterMode('all')}
            />
            <FilterTab
              label="YO"
              active={filterMode === 'mine'}
              onClick={() => setFilterMode('mine')}
              who={meSlot}
            />
            <FilterTab
              label={otherLabel.toUpperCase()}
              active={filterMode === 'other'}
              onClick={() => setFilterMode('other')}
              who={otherSlot}
            />
          </div>
          <SearchBar
            open={searchOpen}
            query={searchQuery}
            onToggle={() => setSearchOpen(true)}
            onClose={closeSearch}
            onQueryChange={setSearchQuery}
          />
          {viewport === 'desktop' && (
            <button
              type="button"
              className="expense-header-add-btn btn btn-success"
              onClick={(e) => { e.stopPropagation(); openDrawer(); }}
              aria-label="Agregar gasto"
            >
              +
            </button>
          )}
        </div>
        {searchOpen && (
          <>
            <SearchScopeToggle scope={searchScope} onChange={setSearchScope} />
            <SearchCategoryFilter
              categories={categoryNames.map((name) => ({ name, emoji: categoryEmojiMap[name] ?? '' }))}
              selected={searchCategory}
              onSelect={setSearchCategory}
            />
          </>
        )}
      </div>

      {/* Scrollable body */}
      <div className="expense-list-body">

        {searchTruncated && (
          <div className="expense-search-truncated">
            <span className="helper-text">Mostrando 500 resultados — refiná la búsqueda</span>
          </div>
        )}

        {loading && !inSearchMode && <SkeletonPlanks count={6} />}

        {!loading && inSearchMode && !searchLoading && periodGroups.length === 0 && (
          <div className="expense-list-empty">
            <p className="expense-list-empty__main">Sin resultados para «{searchQuery.trim()}»</p>
          </div>
        )}

        {!loading && !inSearchMode && periodGroups.length === 0 && (
          <EmptyState filter={filterMode} otherLabel={otherLabel} />
        )}

        {periodGroups.map(([key, items]) => (
          <Fragment key={key}>
            <GroupBanner label={groupLabel(key)} />
            {items.map((expense) => {
              const emoji = categoryEmojiMap[expense.category] ?? '💰';
              return (
                <SwipeableRow
                  key={expense.id}
                  swiped={swipedId === expense.id}
                  onRowClick={togglePlank(expense.id)}
                  onEdit={() => navigate(`/edit/${expense.id}`)}
                  onDelete={() => { setDeleteId(expense.id); setSwipedId(null); }}
                >
                  <CatIconTile emoji={emoji} kind={expense.type} />
                  <div className="expense-row-text">
                    <span className="expense-row-primary">{expensePrimaryText(expense)}</span>
                    <span className="expense-row-secondary">{expenseSecondaryText(expense)}</span>
                  </div>
                  <div className="expense-row-aside">
                    <span className={`expense-row-amount expense-row-amount--${expense.type}`}>
                      {fmtAmount(expense.amount, expense.type, expense.currency)}
                    </span>
                    <PayerBadge payer={slotForUser(expense.user, config)} shared={expense.shared} />
                  </div>
                </SwipeableRow>
              );
            })}
          </Fragment>
        ))}

        {!inSearchMode && <div ref={lastItemRef} className="expense-list-scroll-trigger" />}

        {!inSearchMode && loadingMore && <SkeletonPlanks count={3} />}

        {!inSearchMode && !hasMore && filteredExpenses.length > 0 && (
          <div className="expense-list-end">
            <span className="helper-text">No hay más gastos</span>
          </div>
        )}

      </div>

      {/* FAB */}
      <Link to="/add" className="expense-list-fab">
        <img
          src="/images/icons/plus_icon_transparent.gif"
          alt="Agregar"
          className="expense-list-fab-icon"
        />
      </Link>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="confirm-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="confirm-modal content-panel" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-modal-message">Eliminar este gasto?</p>
            <div className="confirm-modal-actions">
              <button className="btn confirm-modal-cancel" onClick={() => setDeleteId(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-danger confirm-modal-confirm"
                onClick={() => handleDelete(deleteId)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
