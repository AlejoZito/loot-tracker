import type { HTMLAttributes, ReactNode } from 'react';
import './base.css';

/**
 * Generic card container — the de-facto content panel used across pages.
 * Base visuals (material-style defaults) are defined in this component's base.css.
 * Orc theme overrides live in styles/orc-theme.css.
 *
 * Companion classes (card-title, card-text, card-meta, card-amount) are
 * scoped to this component — do not reuse them outside <Card>.
 */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  as?: 'div' | 'section' | 'article';
}

export function Card({ children, className, as: Tag = 'div', ...rest }: CardProps) {
  return (
    <Tag className={`card${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </Tag>
  );
}
