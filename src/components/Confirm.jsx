import { useCallback, useRef, useState } from 'react';
import Dialog from './Dialog.jsx';
import '../styles/overlays.css';

/**
 * useConfirm() -> { confirm, element }
 * An accessible replacement for window.confirm(): render `element` once, then
 * `await confirm({ title, message, confirmLabel, danger })` -> true | false.
 * Escape, the backdrop and Cancel all answer false.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setRequest(options);
  }), []);

  const answer = useCallback((value) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  }, []);

  const element = request ? (
    <Dialog onClose={() => answer(false)} labelledBy="confirm-title">
      <h2 id="confirm-title">{request.title}</h2>
      <p className="dialog-text">{request.message}</p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={() => answer(false)}>{request.cancelLabel || 'Cancel'}</button>
        <button type="button" className={'btn ' + (request.danger ? 'danger' : 'primary')}
                onClick={() => answer(true)}>
          {request.confirmLabel || 'OK'}
        </button>
      </div>
    </Dialog>
  ) : null;

  return { confirm, element };
}
