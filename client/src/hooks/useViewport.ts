import { useState, useEffect } from 'react';

export type Viewport = 'mobile' | 'tablet' | 'desktop';

const DESKTOP = '(min-width: 1100px)';
const TABLET = '(min-width: 760px)';

function currentViewport(): Viewport {
  if (typeof window === 'undefined') return 'mobile';
  if (window.matchMedia(DESKTOP).matches) return 'desktop';
  if (window.matchMedia(TABLET).matches) return 'tablet';
  return 'mobile';
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(currentViewport);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP);
    const tablet = window.matchMedia(TABLET);
    const update = () => setViewport(currentViewport());
    desktop.addEventListener('change', update);
    tablet.addEventListener('change', update);
    return () => {
      desktop.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
    };
  }, []);

  return viewport;
}
