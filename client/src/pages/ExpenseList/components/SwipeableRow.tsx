import { PencilIcon, TrashIcon } from './icons';

interface SwipeableRowProps {
  children: React.ReactNode;
  swiped: boolean;
  onRowClick: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SwipeableRow({ children, swiped, onRowClick, onEdit, onDelete }: SwipeableRowProps) {
  return (
    <div className={`expense-row${swiped ? ' expense-row--swiped' : ''}`}>
      <div className="expense-row-actions">
        <button
          className="expense-row-actions__edit"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          aria-label="Editar"
        >
          <PencilIcon />
        </button>
        <button
          className="expense-row-actions__delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Eliminar"
        >
          <TrashIcon />
        </button>
      </div>
      <div
        className="expense-row-content"
        role="button"
        tabIndex={0}
        onClick={onRowClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRowClick(e as unknown as React.MouseEvent);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
