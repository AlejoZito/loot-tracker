interface SearchScopeToggleProps {
  scope: 'last3m' | 'all';
  onChange: (s: 'last3m' | 'all') => void;
}

export function SearchScopeToggle({ scope, onChange }: SearchScopeToggleProps) {
  return (
    <div className="expense-search-scope" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`expense-search-scope__btn${scope === 'last3m' ? ' expense-search-scope__btn--active' : ''}`}
        onClick={() => onChange('last3m')}
        aria-pressed={scope === 'last3m'}
      >
        Últimos 3 meses
      </button>
      <button
        type="button"
        className={`expense-search-scope__btn${scope === 'all' ? ' expense-search-scope__btn--active' : ''}`}
        onClick={() => onChange('all')}
        aria-pressed={scope === 'all'}
      >
        Todo
      </button>
    </div>
  );
}
