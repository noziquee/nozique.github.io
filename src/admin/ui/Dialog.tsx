import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  /** Read out by screen readers, e.g. "Edit project". */
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A centered dialog over the page. Esc and the × button call onClose. While it is open the page
 * behind does not scroll, Tab stays inside the dialog, and focus returns to where it was.
 */
export function Dialog({ label, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  function keepFocusInside(event: ReactKeyboardEvent) {
    if (event.key !== 'Tab' || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const atStart = document.activeElement === first || document.activeElement === panel.current;
    if (event.shiftKey && atStart) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="dialog-overlay">
      <div
        ref={panel}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={keepFocusInside}
      >
        <button type="button" className="dialog-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
