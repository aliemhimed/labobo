/* localStorage helpers. Keys match the old per-page engines
   (`phys.history`, `chem.wrong`, …) so existing progress survives
   the React rewrite.

   Reads are cached by the raw string, so an unchanged key returns the *same*
   object every time. That makes the getters valid `useSyncExternalStore`
   snapshots (see hooks/useStore.js); treat returned values as read-only and
   pass a fresh object to the matching setter. Writes notify subscribers, which
   is what keeps the dashboard and home counters current without manual ticks. */

const THEME_KEY = 'mcq.theme';
const LEADERBOARD_KEY = 'labobo_leaderboard';
const SCHEMA_VERSION = 2;

/* Growth caps, so a heavy user can't fill the ~5 MB quota. */
const HISTORY_MAX = 200;
const WRONG_MAX = 1500;
const WRONG_ATTEMPTS_MAX = 10;
const FLASHCARDS_MAX = 4000;
const CLEARED_MAX = 3000;

/* ── change notification ─────────────────────────────────────────── */

const listeners = new Set();
let version = 0;
const notify = () => { version++; listeners.forEach((l) => l()); };

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Goes up on every write; a `useSyncExternalStore` snapshot for views that
    read several keys at once (the home page). */
export const getStorageVersion = () => version;

/* Subject progress changed locally (not by the sync applying a download):
   progressSync.js marks the subject for upload. */
let changeListener = null;
let applyingRemote = false;
export function onProgressChange(cb) { changeListener = cb; }
function changed(prefix) {
  if (!applyingRemote && changeListener) changeListener(prefix);
}

// Another tab changed something.
if (typeof window !== 'undefined') window.addEventListener('storage', notify);

/* ── failure reporting ───────────────────────────────────────────── */

const errorListeners = new Set();
let lastErrorAt = 0;

/** cb() runs when a write is rejected (quota full, private mode…), at most
    once every 30 s. Returns an unsubscribe function. */
export function onStorageError(cb) {
  errorListeners.add(cb);
  return () => errorListeners.delete(cb);
}
function reportError() {
  const now = Date.now();
  if (now - lastErrorAt < 30000) return;
  lastErrorAt = now;
  errorListeners.forEach((cb) => cb());
}

/* ── raw access ──────────────────────────────────────────────────── */

const cache = new Map(); // key -> { raw, value }

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function read(key, fallback, transform) {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value = fallback;
  if (raw !== null) {
    try { value = JSON.parse(raw); } catch { value = fallback; }
  }
  if (transform) value = transform(value);
  cache.set(key, { raw, value });
  return value;
}

/** Returns true when the value was persisted. */
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    reportError();
    return false;
  }
  notify();
  return true;
}

/* ── theme ──────────────────────────────────────────────────────── */

export function getTheme() {
  return readRaw(THEME_KEY) || 'auto';
}
export function setTheme(t) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch { /* ignore */ }
}

/* ── leaderboard preferences (opt-in choice + public handle) ─────── */

export const getLeaderboardPrefs = () => read(LEADERBOARD_KEY, {});
export const setLeaderboardPrefs = (patch) => write(LEADERBOARD_KEY, { ...getLeaderboardPrefs(), ...patch });

/* ── per-subject progress ────────────────────────────────────────── */

/* Wrong answers used to be keyed by the question's position in a hard-coded
   array. Now that questions come from the database those positions shift
   whenever a row is added, so entries are keyed by the stable `table:id`
   instead. Legacy numeric keys can no longer be resolved to a question. */
function dropNumericKeys(map) {
  const out = {};
  Object.keys(map || {}).forEach((k) => {
    if (!/^\d+$/.test(k)) out[k] = map[k];
  });
  return out;
}

/* One-time migration per subject, recorded under `labobo.schema.<prefix>`. */
function migrate(prefix) {
  const flag = `labobo.schema.${prefix}`;
  if (Number(readRaw(flag)) >= SCHEMA_VERSION) return;
  const wrongKey = `${prefix}.wrong`;
  const raw = readRaw(wrongKey);
  if (raw !== null) {
    try {
      localStorage.setItem(wrongKey, JSON.stringify(dropNumericKeys(JSON.parse(raw))));
    } catch { /* unreadable or full: leave as is */ }
  }
  try {
    localStorage.setItem(flag, String(SCHEMA_VERSION));
  } catch { /* ignore */ }
}

/* Keep the most recent `max` entries of an object map, ranked by `stamp`. */
function capMap(map, max, stamp) {
  const keys = Object.keys(map);
  if (keys.length <= max) return map;
  return Object.fromEntries(
    keys.sort((a, b) => stamp(map[b]) - stamp(map[a])).slice(0, max).map((k) => [k, map[k]])
  );
}

const keysFor = (prefix) => ({
  HISTORY: `${prefix}.history`,
  WRONG: `${prefix}.wrong`,
  // question id -> when it was last answered correctly (and so left the
  // wrong-answer list). Lets the sync tell "answered right since" apart from
  // "never synced here" when merging two devices' lists.
  CLEARED: `${prefix}.cleared`,
  FLASHCARDS: `labobo_fc_${prefix}`,
});

export function createSubjectStore(prefix) {
  const { HISTORY, WRONG, CLEARED, FLASHCARDS } = keysFor(prefix);

  migrate(prefix);

  const save = (key, value) => {
    const ok = write(key, value);
    changed(prefix);
    return ok;
  };

  return {
    getHistory: () => read(HISTORY, []),
    setHistory: (h) => save(HISTORY, h.slice(0, HISTORY_MAX)),

    getWrong: () => read(WRONG, {}, dropNumericKeys),
    setWrong: (w) => {
      const trimmed = {};
      Object.keys(w).forEach((id) => { trimmed[id] = w[id].slice(-WRONG_ATTEMPTS_MAX); });
      const newest = (attempts) => Date.parse(attempts[attempts.length - 1]?.date) || 0;
      return save(WRONG, capMap(trimmed, WRONG_MAX, newest));
    },

    getCleared: () => read(CLEARED, {}),
    setCleared: (c) => save(CLEARED, capMap(c, CLEARED_MAX, (d) => Date.parse(d) || 0)),

    getFlashcards: () => read(FLASHCARDS, {}),
    setFlashcards: (d) => save(FLASHCARDS, capMap(d, FLASHCARDS_MAX, (c) => c.last || 0)),
  };
}

/* ── whole-subject access, for the account sync ─────────────────── */

/** One subject's progress as a plain object (see progressSync.js). */
export function readProgress(prefix) {
  const s = createSubjectStore(prefix);
  return { history: s.getHistory(), wrong: s.getWrong(), cleared: s.getCleared(), flashcards: s.getFlashcards() };
}

/** Replace one subject's progress with `data` (already merged). Doesn't
    count as a local change, so it isn't uploaded straight back. */
export function applyProgress(prefix, data) {
  const s = createSubjectStore(prefix);
  applyingRemote = true;
  try {
    s.setHistory(data.history || []);
    s.setWrong(data.wrong || {});
    s.setCleared(data.cleared || {});
    s.setFlashcards(data.flashcards || {});
  } finally {
    applyingRemote = false;
  }
}

/** Forget one subject's progress on this device (another account signed in). */
export function clearProgress(prefix) {
  Object.values(keysFor(prefix)).forEach((k) => {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  });
  saveSession(prefix, null);
  notify();
}

/* ── in-progress session (survives a refresh, dies with the tab) ─── */

const sessionKey = (prefix) => `labobo.session.${prefix}`;

export function loadSession(prefix) {
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey(prefix)) || 'null');
  } catch {
    return null;
  }
}
export function saveSession(prefix, session) {
  try {
    if (session) sessionStorage.setItem(sessionKey(prefix), JSON.stringify(session));
    else sessionStorage.removeItem(sessionKey(prefix));
  } catch { /* ignore */ }
}

/* Seed for the shuffled answer-option order (see QuizEngine's
   getDisplayOrder), so a refresh shows each question's options in the same
   A–D slots. */
const optionSeedKey = (prefix) => `labobo.optseed.${prefix}`;

export function loadOptionSeed(prefix) {
  try {
    return sessionStorage.getItem(optionSeedKey(prefix));
  } catch {
    return null;
  }
}
export function saveOptionSeed(prefix, seed) {
  try {
    sessionStorage.setItem(optionSeedKey(prefix), seed);
  } catch { /* ignore */ }
}

/* Study Mode's pool/filters/position — same survives-a-refresh contract as
   the quiz session above, kept under its own key so the two don't collide. */
const studyKey = (prefix) => `labobo.study.${prefix}`;

export function loadStudySession(prefix) {
  try {
    return JSON.parse(sessionStorage.getItem(studyKey(prefix)) || 'null');
  } catch {
    return null;
  }
}
export function saveStudySession(prefix, session) {
  try {
    if (session) sessionStorage.setItem(studyKey(prefix), JSON.stringify(session));
    else sessionStorage.removeItem(studyKey(prefix));
  } catch { /* ignore */ }
}

/* ── home-page progress summary ──────────────────────────────────── */

/** One subject's progress, for the home page cards: last score, session
    count, wrong-answer count, and an in-progress session to resume (if any
    exists and hasn't already finished into a result). */
export function getSubjectSummary(prefix) {
  const store = createSubjectStore(prefix);
  const hist = store.getHistory();
  const session = loadSession(prefix);
  return {
    lastScore: hist[0]?.score ?? null,
    sessionsCount: hist.length,
    wrongCount: Object.keys(store.getWrong()).length,
    resumeMode: session?.mode && !session.record ? session.mode : null,
  };
}
