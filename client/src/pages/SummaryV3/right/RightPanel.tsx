import type { V3State, V3Action } from '../state';
import { DetalleMes } from './DetalleMes/DetalleMes';

interface Props {
  state: V3State;
  dispatch: React.Dispatch<V3Action>;
  budgetUser: string | null;
  availableMonths: string[];
}

export function RightPanel({ state, dispatch, budgetUser, availableMonths }: Props) {
  return (
    <DetalleMes
      month={state.selectedMonth}
      user={state.filters.user}
      budgetUser={budgetUser}
      availableMonths={availableMonths}
      dispatch={dispatch}
    />
  );
}
