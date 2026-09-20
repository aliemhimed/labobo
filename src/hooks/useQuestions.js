import { useEffect, useState } from 'react';
import { loadQuestions } from '../lib/questions.js';

/** Fetches a subject's question bank. Returns { questions, status, error, reload }. */
export function useQuestions(config) {
  const [state, setState] = useState({ questions: [], status: 'loading', error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ questions: [], status: 'loading', error: null });

    loadQuestions(config, ctrl.signal)
      .then((questions) => {
        if (ctrl.signal.aborted) return;
        setState({ questions, status: questions.length ? 'ready' : 'empty', error: null });
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.error('[questions] load failed', err);
        setState({ questions: [], status: 'error', error: err });
      });

    return () => ctrl.abort();
  }, [config, attempt]);

  return { ...state, reload: () => setAttempt((a) => a + 1) };
}
