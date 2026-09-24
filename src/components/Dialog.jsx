import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* Accessible modal: role="dialog", Escape and backdrop click close it, Tab
   stays inside, focus moves in on open and returns to whatever opened it.
   Styled by overlays.css (.dialog-scrim / .dialog). */
export default function Dialog({
  onClose, label, labelledBy, children,
}) {
  const modalRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    const modal = modalRef.current;
    // Prefer a text input (handle picker) over the first button; fall back to the dialog.
    const first = modal.querySelector('input') || modal.querySelector(FOCUSABLE);
    (first || modal).focus({ preventScroll: true });

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(modal.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return; }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="dialog-scrim"
         onMouseDown={(e) => { if (e.target === e.currentTarget) closeRef.current?.(); }}>
      <div ref={modalRef} className="dialog" role="dialog" aria-modal="true"
           aria-label={label} aria-labelledby={labelledBy} tabIndex={-1}>
        {children}
      </div>
    </div>,
    document.body
  );
}
