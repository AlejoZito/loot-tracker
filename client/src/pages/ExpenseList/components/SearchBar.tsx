import { useRef, useEffect } from 'react';

interface SearchBarProps {
  open: boolean;
  query: string;
  onToggle: () => void;
  onClose: () => void;
  onQueryChange: (q: string) => void;
}

export function SearchBar({ open, query, onToggle, onClose, onQueryChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <div
      className={`expense-search${open ? ' expense-search--open' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {!open && (
        <button
          type="button"
          className="expense-search-toggle"
          onClick={onToggle}
          aria-label="Buscar"
        >
          🔍
        </button>
      )}
      {open && (
        <>
          <input
            ref={inputRef}
            type="text"
            className="expense-search-input"
            placeholder="Buscar comentarios..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          <button
            type="button"
            className="expense-search-close"
            onClick={onClose}
            aria-label="Cerrar búsqueda"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
