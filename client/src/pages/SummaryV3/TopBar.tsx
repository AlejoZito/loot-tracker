import { useState } from 'react';
import type { V3Action, UserFilter, RangeFilter } from './state';
import { BottomSheet } from '../../components/primitives/BottomSheet/BottomSheet';
import { useBudgetConfig } from '../../context/BudgetConfigContext';

interface Props {
  user: UserFilter;
  range: RangeFilter;
  dispatch: React.Dispatch<V3Action>;
}

const RANGE_LABELS: Record<RangeFilter, string> = {
  last6: 'Últ. 6',
  ytd: 'Este año',
  all: 'Todo',
};

const USER_OPTS: UserFilter[] = ['all', 'household', 'userA', 'userB'];
const RANGE_OPTS: RangeFilter[] = ['last6', 'ytd', 'all'];

export function TopBar({ user, range, dispatch }: Props) {
  const { labelForSlot } = useBudgetConfig();
  const USER_LABELS: Record<UserFilter, string> = {
    all: 'Todos',
    household: 'Hogar',
    userA: labelForSlot('userA'),
    userB: labelForSlot('userB'),
  };
  const [sheet, setSheet] = useState<null | 'user' | 'range'>(null);

  const setUser = (u: UserFilter) => { dispatch({ type: 'SET_USER', user: u }); setSheet(null); };
  const setRange = (r: RangeFilter) => { dispatch({ type: 'SET_RANGE', range: r, availableMonths: [] }); setSheet(null); };

  return (
    <div className="summary-topbar">
      <h2 className="summary-topbar__title">Análisis</h2>

      {/* Desktop: inline pills */}
      <div className="summary-topbar__pills">
        <div className="summary-topbar__group">
          {USER_OPTS.map(u => (
            <button
              key={u}
              onClick={() => setUser(u)}
              className={`summary-chip${user === u ? ' summary-chip--active' : ''}`}
            >
              {USER_LABELS[u]}
            </button>
          ))}
        </div>

        <div className="summary-topbar__group">
          {RANGE_OPTS.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`summary-chip${range === r ? ' summary-chip--active' : ''}`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: two compact chips → bottom sheet */}
      <div className="summary-topbar__compact">
        <button className="summary-chip summary-chip--compact" onClick={() => setSheet('user')}>
          Persona · <strong>{USER_LABELS[user]}</strong>
        </button>
        <button className="summary-chip summary-chip--compact" onClick={() => setSheet('range')}>
          Rango · <strong>{RANGE_LABELS[range]}</strong>
        </button>
      </div>

      <BottomSheet open={sheet === 'user'} onClose={() => setSheet(null)} title="Persona">
        {USER_OPTS.map(u => (
          <button
            key={u}
            onClick={() => setUser(u)}
            className={`bottom-sheet__option${user === u ? ' bottom-sheet__option--active' : ''}`}
          >
            <span>{USER_LABELS[u]}</span>
            {user === u && <span>✓</span>}
          </button>
        ))}
      </BottomSheet>

      <BottomSheet open={sheet === 'range'} onClose={() => setSheet(null)} title="Rango">
        {RANGE_OPTS.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`bottom-sheet__option${range === r ? ' bottom-sheet__option--active' : ''}`}
          >
            <span>{RANGE_LABELS[r]}</span>
            {range === r && <span>✓</span>}
          </button>
        ))}
      </BottomSheet>
    </div>
  );
}
