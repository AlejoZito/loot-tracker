import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './BottomSheet.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="bottom-sheet__overlay" onClick={onClose} role="presentation">
      <div
        className="bottom-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
      >
        <div className="bottom-sheet__grip" />
        {title && <p className="bottom-sheet__title">{title}</p>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
