import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useDialogNPC } from '../../dialog-npc-temp';
import { pickHabitDialog } from '../../dialog/dialogs';
import type { Habit, HabitCategory, HabitMonthSummary } from '../../types';
import { Card } from '../../components/primitives/Card/Card';
import { HabitHeatmap } from '../../components/HabitHeatmap/HabitHeatmap';

function formatDay(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function formatMonth(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${mm}`;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  });
}

export default function Habits() {
  const navigate = useNavigate();
  const npc = useDialogNPC();
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<HabitMonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Stable start/end of current calendar month for the heatmap
  const heatmapStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const heatmapEnd = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }, []);

  // Client-side cache: day string → Habit[]
  const cacheRef = useRef<Map<string, Habit[]>>(new Map());
  // Track in-flight initDay requests to prevent duplicate writes
  const initInFlightRef = useRef<Map<string, Promise<Habit[]>>>(new Map());

  const fetchMonthlySummary = useCallback(async () => {
    try {
      const summary = await api.getHabitMonthlySummary(formatMonth(new Date()));
      setMonthlySummary(summary);
    } catch (err) {
      console.error('Error fetching monthly summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Load habits for a day from cache or init via server
  const loadDayHabits = useCallback(async (date: Date, cats: HabitCategory[]) => {
    const dayStr = formatDay(date);
    const cached = cacheRef.current.get(dayStr);
    if (cached && cached.length > 0) {
      setHabits(cached);
      setLoading(false);
      return;
    }

    // Not in cache — init on server, but deduplicate concurrent calls
    setLoading(true);
    try {
      let promise = initInFlightRef.current.get(dayStr);
      if (!promise) {
        promise = api.initDay(dayStr);
        initInFlightRef.current.set(dayStr, promise);
      }
      const dayHabits = await promise;
      initInFlightRef.current.delete(dayStr);
      cacheRef.current.set(dayStr, dayHabits);
      setHabits(dayHabits);
    } catch (err) {
      console.error('Error fetching habits:', err);
      initInFlightRef.current.delete(dayStr);
      // Show defaults from categories as fallback
      const fallback = cats.map(c => ({
        day: dayStr,
        categoryId: c.id,
        value: c.defaultValue,
      }));
      setHabits(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: fetch categories + bulk load last 30 days + monthly summary
  useEffect(() => {
    async function init() {
      try {
        const [cats, recentHabits] = await Promise.all([
          api.getHabitCategories(),
          api.getHabitsRecent(31),
        ]);
        setCategories(cats);

        // Populate cache grouped by day (reset first to handle StrictMode double-mount)
        cacheRef.current = new Map();
        for (const h of recentHabits) {
          const existing = cacheRef.current.get(h.day) || [];
          existing.push(h);
          cacheRef.current.set(h.day, existing);
        }

        // Load today from cache (or init if not present)
        await loadDayHabits(selectedDay, cats);
        await fetchMonthlySummary();
      } catch (err) {
        console.error('Error during init:', err);
        setLoading(false);
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On day change, load from cache or server
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  useEffect(() => {
    if (categories.length > 0) {
      loadDayHabits(selectedDay, categoriesRef.current);
    }
  }, [selectedDay, loadDayHabits, categories.length]);

  const changeDay = (offset: number) => {
    setSelectedDay(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + offset);
      return next;
    });
  };

  const handleToggle = async (categoryId: string, currentValue: boolean) => {
    const dayStr = formatDay(selectedDay);
    const newValue = !currentValue;

    // Optimistic update (state + cache)
    const updateHabits = (list: Habit[]) =>
      list.map(h => h.categoryId === categoryId ? { ...h, value: newValue } : h);

    setHabits(updateHabits);
    const cached = cacheRef.current.get(dayStr);
    if (cached) cacheRef.current.set(dayStr, updateHabits(cached));

    setSavingIds(prev => new Set(prev).add(categoryId));
    try {
      await api.updateHabit({ day: dayStr, categoryId, value: newValue });
      fetchMonthlySummary();
      const dialog = pickHabitDialog(categoryId, newValue);
      if (dialog) npc.show(dialog);
      else if (newValue) npc.show('¡Excelente trabajo!');
    } catch (err) {
      console.error('Error updating habit:', err);
      // Revert
      const revert = (list: Habit[]) =>
        list.map(h => h.categoryId === categoryId ? { ...h, value: currentValue } : h);
      setHabits(revert);
      const cachedRevert = cacheRef.current.get(dayStr);
      if (cachedRevert) cacheRef.current.set(dayStr, revert(cachedRevert));
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  // Flatten all cached days for the heatmap. Recomputes whenever `habits` changes
  // (which happens after every cache update: day navigation or toggle).
  const allCachedHabits = useMemo(
    () => [...cacheRef.current.values()].flat(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits],
  );

  return (
    <div className="habits-page page-bg">
      <div className="content-panel">
        {/* Day Navigation */}
        <div className="habits-header">
          <button className="habits-day-nav btn" onClick={() => changeDay(-1)}>
            &larr;
          </button>
          <span className="habits-day-label">{formatDayLabel(selectedDay)}</span>
          <button className="habits-day-nav btn" onClick={() => changeDay(1)}>
            &rarr;
          </button>
        </div>

        <div className="habits-cards-grid">
        {/* Monthly Progress */}
        <Card className="habits-progress-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="habits-section-title">Progreso mensual</h3>
            <button
              className="btn"
              onClick={() => navigate('/habits/history')}
              style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}
            >
              Historial
            </button>
          </div>
          {summaryLoading ? (
            [0, 1, 2].map(i => (
              <div key={i} className="habits-progress-item">
                <div className="habits-progress-label">
                  <span className="habits-skeleton habits-skeleton-text" />
                  <span className="habits-skeleton habits-skeleton-pct" />
                </div>
                <div className="habits-progress-bar">
                  <div className="habits-skeleton habits-skeleton-bar" />
                </div>
              </div>
            ))
          ) : (
            monthlySummary.map(item => (
              <div key={item.categoryId} className="habits-progress-item">
                <div className="habits-progress-label">
                  <span>{item.emoji} {item.name}</span>
                  <span>{item.percentage}%</span>
                </div>
                <div className="habits-progress-bar">
                  <div
                    className="habits-progress-fill"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))
          )}
          <div style={{ borderTop: '1px solid var(--muted-fg)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
            <HabitHeatmap
              habits={allCachedHabits}
              categories={categories}
              startDate={heatmapStart}
              endDate={heatmapEnd}
            />
          </div>
        </Card>

        {/* Daily Toggles */}
        <Card className="habits-daily-section">
          {loading ? (
            <div className="habits-loading">Cargando...</div>
          ) : (
            habits.map(habit => (
              <div key={habit.categoryId} className="habits-toggle-row">
                <span className="habits-toggle-label">
                  {categories.find(c => c.id === habit.categoryId)?.emoji} {getCategoryName(habit.categoryId)}
                </span>
                <button
                  className={`switch-toggle ${habit.value ? 'switch-toggle-on' : ''}`}
                  onClick={() => handleToggle(habit.categoryId, habit.value)}
                  disabled={savingIds.has(habit.categoryId)}
                >
                  <div className={`switch-thumb ${habit.value ? 'switch-thumb-on' : 'switch-thumb-off'}`} />
                </button>
              </div>
            ))
          )}
        </Card>
        </div>

      </div>
    </div>
  );
}
