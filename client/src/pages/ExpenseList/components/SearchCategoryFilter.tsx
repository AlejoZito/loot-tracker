interface SearchCategoryFilterProps {
  categories: { name: string; emoji: string }[];
  selected: string | null;
  onSelect: (c: string | null) => void;
}

export function SearchCategoryFilter({ categories, selected, onSelect }: SearchCategoryFilterProps) {
  if (categories.length === 0) return null;
  return (
    <div className="expense-search-cats" onClick={(e) => e.stopPropagation()}>
      {categories.map((cat) => {
        const active = selected === cat.name;
        return (
          <button
            key={cat.name}
            type="button"
            title={cat.name}
            aria-label={cat.name}
            aria-pressed={active}
            className={`expense-search-cat${active ? ' expense-search-cat--active' : ''}`}
            onClick={() => onSelect(active ? null : cat.name)}
          >
            <span className="expense-search-cat__emoji">{cat.emoji || cat.name.charAt(0).toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
