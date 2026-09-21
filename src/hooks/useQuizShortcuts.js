import { useEffect, useRef } from 'react';

/* Keyboard shortcuts for a question on screen:
     1-9 / A-F   choose that option (in the order shown)
     ← / →       previous / next question
   Ignored while typing in a field, while a dialog is open, and with modifier
   keys held. `handlers` is read through a ref so the listener is attached once. */
export function useQuizShortcuts(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const { optionCount, onChoose, onPrev, onNext } = ref.current;

      if (e.key === 'ArrowRight') { onNext?.(); e.preventDefault(); return; }
      if (e.key === 'ArrowLeft') { onPrev?.(); e.preventDefault(); return; }

      const k = e.key.length === 1 ? e.key.toLowerCase() : '';
      let pos = -1;
      if (k >= '1' && k <= '9') pos = Number(k) - 1;
      else if (k >= 'a' && k <= 'f') pos = k.charCodeAt(0) - 97;
      if (pos >= 0 && pos < optionCount) { onChoose(pos); e.preventDefault(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
