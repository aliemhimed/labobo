import { useCallback, useRef, useState } from 'react';
import Dialog from './Dialog.jsx';
import '../styles/overlays.css';

/**
 * useNamePrompt() -> { element, ask }
 * Render `element` once; `await ask({ title, message, confirmLabel, skipLabel })`
 * resolves with the trimmed name on submit, or null if skipped or closed.
 * This is the one place a guest is asked to name themselves — never a gate,
 * always at the moment a name would actually do something (see callers).
 */
export function useNamePrompt() {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const ask = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setRequest(options);
  }), []);

  const answer = useCallback((value) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  }, []);

  const element = request ? <NamePromptDialog {...request} onDone={answer} /> : null;
  return { ask, element };
}

function NamePromptDialog({ title, message, confirmLabel, skipLabel, onDone }) {
  const [value, setValue] = useState('');
  const name = value.trim();

  function submit() {
    if (name) onDone(name);
  }

  return (
    <Dialog onClose={() => onDone(null)} labelledBy="name-prompt-title">
      <h3 id="name-prompt-title">{title}</h3>
      {message ? <p>{message}</p> : null}
      <label htmlFor="name-prompt-input" className="sr-only">Your name</label>
      <input id="name-prompt-input" type="text" className="lb-input" value={value} maxLength={40}
             placeholder="Your name (e.g., Ali)" autoComplete="off" autoFocus
             onChange={(e) => setValue(e.target.value)}
             onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
      <div className="lb-actions">
        <button className="lb-btn" onClick={() => onDone(null)}>{skipLabel || "Don't save"}</button>
        <button className="lb-btn lb-btn-primary" disabled={!name} onClick={submit}>
          {confirmLabel || 'Save'}
        </button>
      </div>
    </Dialog>
  );
}
