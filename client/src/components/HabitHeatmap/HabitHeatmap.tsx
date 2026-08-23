import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import type { Habit, HabitCategory } from '../../types';
import { HABIT_COLORS, colorForCategory } from './colors';
import './HabitHeatmap.css';

interface HeatmapDay {
  date: Date;      // Local Date object — prevents UTC-vs-local index misalignment in library
  dateStr: string; // ISO string used for isFuture comparison and tooltip label
  doneIds: string[];
  isFuture: boolean;
  isOutOfRange: boolean; // padding day before `startDate`, drawn to complete the first week
}

interface Props {
  habits: Habit[];
  categories: HabitCategory[];
  startDate: Date;
  endDate: Date;
  /** Cell size in CSS pixels. Library renders cells at 10 viewBox units;
   *  we set explicit SVG width/height so cells display at this size. */
  cellSize?: number;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH_LABELS_ES: [string, string, string, string, string, string, string, string, string, string, string, string] =
  ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Library Sunday-first array (odd indices rendered by library; we override all labels in useLayoutEffect)
const WEEKDAY_LABELS_ES: [string, string, string, string, string, string, string] =
  ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const LIBRARY_SQUARE_SIZE = 10;
const GUTTER_SIZE = 1; // must match gutterSize prop
const ROW_H = LIBRARY_SQUARE_SIZE + GUTTER_SIZE; // 11
const TOTAL_ROW_H = 7 * ROW_H; // 77
const COL_W = ROW_H; // columns and rows share the square+gutter pitch

// Monday-first display order (top → bottom)
const MON_FIRST_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function shiftDays(d: Date, days: number): Date {
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

/** Monday of the week containing `d` — the first square of the Monday-first grid. */
function mondayOfWeek(d: Date): Date {
  const dow = d.getDay(); // 0 = Sunday
  return shiftDays(d, dow === 0 ? -6 : 1 - dow);
}

export function HabitHeatmap({ habits, categories, startDate, endDate, cellSize = 12 }: Props) {
  const today = toISO(new Date());
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const doneByDay = React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const h of habits) {
      if (!h.value) continue;
      if (!map.has(h.day)) map.set(h.day, new Set());
      map.get(h.day)!.add(h.categoryId);
    }
    return map;
  }, [habits]);

  // The grid always begins on a Monday so that the Sunday-shift below never lands off-canvas.
  // Days between that Monday and `startDate` are drawn as padding.
  const gridStart = React.useMemo(() => mondayOfWeek(startDate), [startDate]);

  const values = React.useMemo<HeatmapDay[]>(() => {
    const startIso = toISO(startDate);
    const result: HeatmapDay[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= endDate) {
      const iso = toISO(cursor);
      const done = doneByDay.get(iso);
      const doneIds = done ? categories.filter(c => done.has(c.id)).map(c => c.id) : [];
      result.push({
        date: new Date(cursor), // local midnight — avoids UTC-parse offset vs. local startDate
        dateStr: iso,
        doneIds,
        isFuture: iso > today,
        isOutOfRange: iso < startIso,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [gridStart, startDate, endDate, doneByDay, categories, today]);

  // After render: set explicit SVG pixel dimensions and replace library weekday labels
  // with Monday-first ordering (library always renders Sunday-first).
  React.useLayoutEffect(() => {
    const svg = wrapperRef.current?.querySelector('svg');
    if (!svg) return;

    const vb = svg.getAttribute('viewBox')?.split(/\s+/);
    if (!vb || vb.length !== 4) return;
    const scale = cellSize / LIBRARY_SQUARE_SIZE;
    svg.setAttribute('width', String(parseFloat(vb[2]) * scale));
    svg.setAttribute('height', String(parseFloat(vb[3]) * scale));

    // Remove all weekday labels (library-rendered and previously injected)
    svg.querySelectorAll('.react-calendar-heatmap-weekday-label').forEach(el => el.remove());

    const labelGroup = svg.querySelector('.react-calendar-heatmap-weekday-labels');
    if (!labelGroup) return;

    // Inject all 7 labels in Monday-first order at the correct y positions
    MON_FIRST_LABELS.forEach((label, i) => {
      const y = (i + 1) * LIBRARY_SQUARE_SIZE + i * GUTTER_SIZE;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '0');
      text.setAttribute('y', String(y));
      text.setAttribute('class', 'react-calendar-heatmap-weekday-label heatmap-injected-label');
      text.textContent = label;
      labelGroup.appendChild(text);
    });
  }, [cellSize, values]);

  const renderCell = React.useCallback(
    // Library actually passes a ReactElement, not a props object — @types lies.
    (element: React.ReactElement, value: HeatmapDay | undefined, idx: number) => {
      const props = element.props as React.SVGProps<SVGRectElement>;
      const X = Number(props.x ?? 0);
      const Y = Number(props.y ?? 0);
      const W = Number(props.width ?? 10);
      const H = Number(props.height ?? 10);

      // Shift rows for Monday-first display: Sunday (Y=0) moves to bottom (Y=66),
      // Monday (Y=11) moves to top (Y=0), etc.
      const NY = (Y - ROW_H + TOTAL_ROW_H) % TOTAL_ROW_H;

      // Rotating the row is only half of it: the library groups weeks Sunday-first, so a Sunday
      // closes the Monday-first week drawn in the *previous* column. X is relative to that week's
      // <g>, so -COL_W puts it there. The first column's Sunday is always out of range (the grid
      // starts on a Monday), so nothing is ever pushed off the left edge.
      const NX = Y === 0 ? X - COL_W : X;

      const dateLabel = value ? value.dateStr.split('-').reverse().join('-') : null;

      if (!value || value.isFuture || value.isOutOfRange) {
        return (
          <g key={idx}>
            <rect x={NX} y={NY} width={W} height={H} rx={2} ry={2} fill="var(--muted-fg)" fillOpacity={0.15} />
            {dateLabel && <title>{dateLabel}</title>}
          </g>
        );
      }

      const { doneIds } = value;

      if (doneIds.length === 0) {
        return (
          <g key={idx}>
            <rect x={NX} y={NY} width={W} height={H} rx={2} ry={2} fill="var(--muted-fg)" fillOpacity={0.35} />
            <title>{dateLabel}</title>
          </g>
        );
      }

      const colors = doneIds.map(id => colorForCategory(id, categories));

      if (doneIds.length === 1) {
        return (
          <g key={idx}>
            <rect x={NX} y={NY} width={W} height={H} rx={2} ry={2} fill={colors[0]} />
            <title>{dateLabel}</title>
          </g>
        );
      }

      // 2+ habits: diagonal TL→BR split. 3rd habit gets a corner triangle overlaid in BR.
      const clipId = `hc-${idx}`;
      return (
        <g key={idx}>
          <title>{dateLabel}</title>
          <defs>
            <clipPath id={clipId}>
              <rect x={NX} y={NY} width={W} height={H} rx={2} ry={2} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <polygon points={`${NX},${NY} ${NX + W},${NY} ${NX},${NY + H}`} fill={colors[0]} />
            <polygon points={`${NX + W},${NY} ${NX + W},${NY + H} ${NX},${NY + H}`} fill={colors[1]} />
            {doneIds.length >= 3 && (
              <polygon
                points={`${NX + W * 0.45},${NY + H} ${NX + W},${NY + H} ${NX + W},${NY + H * 0.45}`}
                fill={colors[2]}
              />
            )}
          </g>
        </g>
      );
    },
    [categories],
  );

  return (
    <div>
      <div ref={wrapperRef} className="habit-heatmap-scroll">
        <CalendarHeatmap
          // The library's startDate is exclusive (it renders from startDate + 1), so pass the day
          // before the grid start — otherwise the first day of the range is never drawn.
          startDate={shiftDays(gridStart, -1)}
          endDate={endDate}
          values={values as any}
          showMonthLabels
          monthLabels={MONTH_LABELS_ES}
          showWeekdayLabels
          weekdayLabels={WEEKDAY_LABELS_ES}
          gutterSize={GUTTER_SIZE}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transformDayElement={renderCell as any}
        />
      </div>
      <div className="habit-heatmap-legend">
        {categories.map((cat, i) => (
          <div key={cat.id} className="habit-heatmap-legend-item" title={cat.name}>
            <div
              className="habit-heatmap-legend-color"
              style={{ backgroundColor: HABIT_COLORS[i % HABIT_COLORS.length] }}
            />
            <span>{cat.emoji}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
