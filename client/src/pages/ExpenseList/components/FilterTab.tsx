import { PAYER_IMG } from '../constants';
import { useBudgetConfig } from '../../../context/BudgetConfigContext';

interface FilterTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
  who?: 'userA' | 'userB';
}

export function FilterTab({ label, active, onClick, who }: FilterTabProps) {
  const { labelForSlot } = useBudgetConfig();
  return (
    <button
      className={`expense-filter-tab${active ? ' expense-filter-tab--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {who && (
        <img
          src={PAYER_IMG[who]}
          alt={labelForSlot(who)}
          className={`expense-filter-tab__img${active ? '' : ' expense-filter-tab__img--inactive'}`}
        />
      )}
      {label}
    </button>
  );
}
