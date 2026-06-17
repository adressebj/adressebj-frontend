'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const target =
      initialFocusRef?.current ??
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      dialogRef.current;
    target?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, initialFocusRef]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [closeOnEscape, onClose],
  );

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      // z-[1100] : Leaflet panes/controls peuvent monter à 700-1000. Sans ça
      // la carte d'arrière-plan transperce le modal au scroll.
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/50"
      onClick={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={classNames(
          'w-full max-w-lg bg-surface text-text-primary',
          'border border-border shadow-lg',
          'rounded-lg outline-none flex flex-col max-h-[90vh]',
        )}
      >
        <header className="flex items-start justify-between gap-4 p-5 border-b border-border">
          <h2
            id="modal-title"
            className="font-display font-bold text-h3 leading-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-sm p-1 text-text-muted hover:text-text-primary hover:bg-surface-muted"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="overflow-y-auto p-5 text-body">{children}</div>
        {footer ? (
          // Mobile : pile verticale (action principale en bas par défaut UX
          // mobile, donc reverse pour que le dernier enfant — primaire —
          // remonte). Desktop : ligne horizontale alignée à droite.
          // [&>button]:w-full force les boutons à prendre toute la largeur
          // sur mobile pour qu'ils ne paraissent pas tronqués.
          <footer
            className={classNames(
              'p-5 border-t border-border',
              'flex flex-col-reverse gap-3',
              'sm:flex-row sm:flex-wrap sm:justify-end',
              '[&>button]:w-full sm:[&>button]:w-auto',
            )}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
