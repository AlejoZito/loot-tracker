import { useRightSlot } from '../../context/RightSlotContext';
import { SummaryWidget } from './SummaryWidget';
import { AddExpenseForm } from '../AddExpense/AddExpenseForm';

export function RightSlotPanel() {
  const { isDrawerOpen, closeDrawer, notifyExpenseSaved } = useRightSlot();

  return (
    <div className="right-slot-panel">
      {isDrawerOpen ? (
        <div className="right-slot-drawer">
          <div className="right-slot-drawer-header">
            <span className="right-slot-drawer-title">Nuevo gasto</span>
            <button
              type="button"
              className="right-slot-drawer-close btn"
              onClick={closeDrawer}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="right-slot-drawer-body">
            <AddExpenseForm
              onSuccess={() => {
                notifyExpenseSaved();
                closeDrawer();
              }}
              onCancel={closeDrawer}
            />
          </div>
        </div>
      ) : (
        <SummaryWidget />
      )}
    </div>
  );
}
