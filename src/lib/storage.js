/* localStorage helpers. Keys match the old per-page engines
   (`phys.history`, `chem.wrong`, …) so existing progress survives
   the React rewrite. */

const USER_KEY = 'mcq.user';
const THEME_KEY = 'mcq.theme';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — progress just won't persist */
  }
}

export function getUser() {
  return read(USER_KEY, null);
}
export function setUser(u) {
  write(USER_KEY, u);
}
export function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
}

export function getTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
}
export function setTheme(t) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch { /* ignore */ }
}

export function createSubjectStore(prefix) {
  const HISTORY = `${prefix}.history`;
  const WRONG = `${prefix}.wrong`;
  const FLASHCARDS = `labobo_fc_${prefix}`;

  return {
    getHistory: () => read(HISTORY, []),
    setHistory: (h) => write(HISTORY, h),

    /* Wrong answers used to be keyed by the question's position in a
       hard-coded array. Now that questions come from the database those
       positions shift whenever a row is added, so entries are keyed by the
       stable `table:id` instead. Legacy numeric keys are dropped on read —
       they can no longer be resolved to a question. */
    getWrong: () => {
      const raw = read(WRONG, {});
      const out = {};
      Object.keys(raw).forEach((k) => {
        if (!/^\d+$/.test(k)) out[k] = raw[k];
      });
      return out;
    },
    setWrong: (w) => write(WRONG, w),

    getFlashcards: () => read(FLASHCARDS, {}),
    setFlashcards: (d) => write(FLASHCARDS, d),
  };
}
