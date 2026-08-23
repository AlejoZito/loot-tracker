import React from 'react';

export interface LegendItem {
  key: string;
  color: string;
  label?: string;
  /** Right-aligned content shown in row layout */
  meta?: React.ReactNode;
  /** Static item (e.g. trendline) — shown but not filterable */
  noFilter?: boolean;
  /** Render a dash marker instead of a circle (for trendlines) */
  isDash?: boolean;
}

interface Props {
  items: LegendItem[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
  onIsolate: (key: string) => void;
  /** chips: inline wrapping (default). rows: full-width with right-aligned meta. */
  layout?: 'chips' | 'rows';
}

const CIRCLE_BTN: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.1rem',
  borderRadius: '50%',
};

const TEXT_BTN: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.1rem 0.2rem',
  fontSize: '0.62rem',
  color: 'var(--fg)',
  whiteSpace: 'nowrap',
  textAlign: 'left',
};

export function FilterLegend({ items, hidden, onToggle, onIsolate, layout = 'chips' }: Props) {
  const isRows = layout === 'rows';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isRows ? 'column' : 'row',
      flexWrap: isRows ? 'nowrap' : 'wrap',
      gap: isRows ? '0.15rem' : '0.3rem 0.6rem',
      marginTop: '0.5rem',
    }}>
      {items.map(item => {
        const { key, color, label = key, meta, noFilter, isDash } = item;
        const isActive = noFilter || !hidden.has(key);

        const markerStyle: React.CSSProperties = isDash
          ? { width: 14, height: 2, borderRadius: 1, display: 'inline-block', backgroundColor: color }
          : { width: 9, height: 9, borderRadius: '50%', display: 'inline-block', backgroundColor: color };

        const marker = <span style={markerStyle} />;

        if (noFilter) {
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {marker}
              <span style={{ fontSize: '0.62rem', color: 'var(--fg)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          );
        }

        return (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isRows ? 'space-between' : undefined,
              gap: '0.25rem',
              opacity: isActive ? 1 : 0.3,
              transition: 'opacity 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: 0 }}>
              <button onClick={() => onToggle(key)} title="Mostrar/ocultar" style={CIRCLE_BTN}>
                {marker}
              </button>
              <button onClick={() => onIsolate(key)} title="Ver solo esta" style={TEXT_BTN}>
                {label}
              </button>
            </div>
            {meta !== undefined && (
              <span style={{ fontSize: '0.62rem', color: 'var(--muted-fg)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {meta}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
