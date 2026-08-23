import { useState, useRef, useCallback } from 'react';

export function useCategoryFilter(categories: string[]) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const catsRef = useRef(categories);
  catsRef.current = categories;

  const toggle = useCallback((cat: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
        if (next.size >= catsRef.current.length) return new Set();
      }
      return next;
    });
  }, []);

  const isolate = useCallback((cat: string) => {
    setHidden(prev => {
      const cats = catsRef.current;
      const active = cats.filter(c => !prev.has(c));
      if (active.length === 1 && active[0] === cat) return new Set();
      return new Set(cats.filter(c => c !== cat));
    });
  }, []);

  const reset = useCallback(() => setHidden(new Set()), []);

  return { hidden, toggle, isolate, reset };
}
