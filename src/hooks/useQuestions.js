import { useQuery } from '@tanstack/react-query';
import { loadQuestions } from '../lib/questions.js';

const NO_QUESTIONS = [];

/** Query options for a subject's bank. Shared with the home page, which
    prefetches a bank when a subject card is hovered or touched, so the
    subject page then finds it already in the cache. */
export function questionsQuery(config) {
  return {
    queryKey: ['questions', config?.storagePrefix],
    queryFn: ({ signal }) => loadQuestions(config, signal).catch((err) => {
      if (!signal.aborted) console.error('[questions] load failed', err);
      throw err;
    }),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    // loadQuestions already falls back from /api to Supabase; surface a
    // failure straight away and let the page's "Try again" button retry.
    retry: false,
  };
}

/** Fetches a subject's question bank. Returns { questions, status, error, reload }.

    Cached by React Query for the life of the page, so going home and back
    into a subject doesn't re-download its bank. The bank is never refetched
    in the background (staleTime: Infinity): question indices must stay stable
    while a quiz session is in progress, and a full page load picks up any
    edits anyway. */
export function useQuestions(config) {
  const query = useQuery({ ...questionsQuery(config), enabled: !!config });

  const questions = query.data ?? NO_QUESTIONS;
  // A manual reload shows the loading screen again, as it did before caching.
  let status;
  if (query.isPending || (query.isFetching && !questions.length)) status = 'loading';
  else if (query.isError) status = 'error';
  else status = questions.length ? 'ready' : 'empty';

  return {
    questions,
    status,
    error: status === 'error' ? query.error : null,
    reload: () => query.refetch(),
  };
}
