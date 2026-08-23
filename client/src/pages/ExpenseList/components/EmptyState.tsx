type FilterMode = 'all' | 'mine' | 'other';

interface EmptyStateProps {
  filter: FilterMode;
  otherLabel: string;
}

export function EmptyState({ filter, otherLabel }: EmptyStateProps) {
  const messages: Record<FilterMode, { main: string; sub?: string }> = {
    all: { main: 'Sin gastos todavía', sub: 'Tocá el ícono para agregar uno' },
    mine: { main: 'No tenés gastos en este filtro' },
    other: { main: `${otherLabel} no tiene gastos cargados` },
  };
  const { main, sub } = messages[filter];
  return (
    <div className="expense-list-empty">
      <p className="expense-list-empty__main">{main}</p>
      {sub && <p className="expense-list-empty__sub">{sub}</p>}
    </div>
  );
}
