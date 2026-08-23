import { PAYER_IMG } from '../constants';
import { useBudgetConfig } from '../../../context/BudgetConfigContext';

interface PayerBadgeProps {
  payer: 'userA' | 'userB';
  shared: boolean;
}

export function PayerBadge({ payer, shared }: PayerBadgeProps) {
  const { labelForSlot } = useBudgetConfig();
  return (
    <div className="expense-payer-badge">
      <img
        src={PAYER_IMG.userA}
        alt={labelForSlot('userA')}
        className={`expense-payer-badge__img${payer !== 'userA' ? ' expense-payer-badge__secondary' : ''}`}
        style={!shared && payer !== 'userA' ? { display: 'none' } : undefined}
      />
      <img
        src={PAYER_IMG.userB}
        alt={labelForSlot('userB')}
        className={`expense-payer-badge__img${payer !== 'userB' ? ' expense-payer-badge__secondary' : ''}`}
        style={!shared && payer !== 'userB' ? { display: 'none' } : undefined}
      />
    </div>
  );
}
