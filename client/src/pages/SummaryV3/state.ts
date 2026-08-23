import { currentPeriod } from './utils/dates';

export type UserFilter = 'all' | 'household' | 'userA' | 'userB';
export type RangeFilter = 'last6' | 'ytd' | 'all';

export type V3State = {
  filters: { user: UserFilter; range: RangeFilter };
  selectedMonth: string;
};

export type V3Action =
  | { type: 'SET_USER'; user: UserFilter }
  | { type: 'SET_RANGE'; range: RangeFilter; availableMonths: string[] }
  | { type: 'SELECT_MONTH'; month: string };

export function initialState(_budgetUser: string | null): V3State {
  return {
    filters: {
      user: 'all',
      range: 'last6',
    },
    selectedMonth: currentPeriod(),
  };
}

export function reducer(state: V3State, action: V3Action): V3State {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, filters: { ...state.filters, user: action.user } };

    case 'SET_RANGE': {
      const filters = { ...state.filters, range: action.range };
      const months = action.availableMonths;
      const fallback = months.length > 0 ? months[months.length - 1] : state.selectedMonth;
      const selectedMonth = months.includes(state.selectedMonth) ? state.selectedMonth : fallback;
      return { ...state, filters, selectedMonth };
    }

    case 'SELECT_MONTH':
      return { ...state, selectedMonth: action.month };

    default:
      return state;
  }
}
