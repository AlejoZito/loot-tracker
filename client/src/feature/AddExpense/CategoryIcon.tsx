import { useState, useEffect } from 'react';

interface CategoryIconProps {
  categoryId: string;
  emoji: string;
  name: string;
  className?: string;
}

/**
 * Category icon with an emoji fallback.
 *
 * The app bundles .jpg icons for a handful of category ids, but categories are defined in
 * your sheet — any id without a matching bundled image would otherwise render as a broken
 * image. Falls back to the category's emoji (also from the sheet), which is what the
 * expense list already displays.
 */
export function CategoryIcon({ categoryId, emoji, name, className }: CategoryIconProps) {
  const [failed, setFailed] = useState(false);

  // Reset when the category changes, so a previously-failed id doesn't stick to a new one
  useEffect(() => { setFailed(false); }, [categoryId]);

  if (failed || !categoryId) {
    return (
      <span className={className} role="img" aria-label={name}>
        {emoji || '💰'}
      </span>
    );
  }

  return (
    <img
      src={`/images/icons/${categoryId}.jpg`}
      alt={name}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
