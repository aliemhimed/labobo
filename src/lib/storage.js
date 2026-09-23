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
const SEEN_ANNOUNCEMENTS_KEY = 'labobo_seen_announcements';
const ANNOUNCEMENTS_CACHE_KEY = 'labobo_announcements_cache_v1';
const SCHEMA_VERSION = 2;

/* Growth caps, so a heavy user can't fill the ~5 MB quota. */
const HISTORY_MAX = 200;
const WRONG_MAX = 1500;
const WRONG_ATTEMPTS_MAX = 10;
const FLASHCARDS_MAX = 4000;

/* ── change notification ─────────────────────────────────────────── */

const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
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
  return readRaw(THEME_KEY) || 'dark';
}
export function setTheme(t) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch { /* ignore */ }
}

/* ── leaderboard preferences (opt-in choice + public handle) ─────── */

export const getLeaderboardPrefs = () => read(LEADERBOARD_KEY, {});
export const setLeaderboardPrefs = (patch) => write(LEADERBOARD_KEY, { ...getLeaderboardPrefs(), ...patch });

/* ── announcements ───────────────────────────────────────────────── */

export const getSeenAnnouncements = () => read(SEEN_ANNOUNCEMENTS_KEY, []);
export function markAnnouncementSeen(id) {
  const seen = getSeenAnnouncements();
  if (!seen.includes(id)) write(SEEN_ANNOUNCEMENTS_KEY, [...seen, id]);
}
/** { t: timestamp, items: [...] } or null. */
export const getAnnouncementsCache = () => read(ANNOUNCEMENTS_CACHE_KEY, null);
export const setAnnouncementsCache = (items) => write(ANNOUNCEMENTS_CACHE_KEY, { t: Date.now(), items });

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

export function createSubjectStore(prefix) {
  const HISTORY = `${prefix}.history`;
  const WRONG = `${prefix}.wrong`;
  const FLASHCARDS = `labobo_fc_${prefix}`;

  migrate(prefix);

  return {
    getHistory: () => read(HISTORY, []),
    setHistory: (h) => write(HISTORY, h.slice(0, HISTORY_MAX)),

    getWrong: () => read(WRONG, {}, dropNumericKeys),
    setWrong: (w) => {
      const trimmed = {};
      Object.keys(w).forEach((id) => { trimmed[id] = w[id].slice(-WRONG_ATTEMPTS_MAX); });
      const newest = (attempts) => Date.parse(attempts[attempts.length - 1]?.date) || 0;
      return write(WRONG, capMap(trimmed, WRONG_MAX, newest));
    },

    getFlashcards: () => read(FLASHCARDS, {}),
    setFlashcards: (d) => write(FLASHCARDS, capMap(d, FLASHCARDS_MAX, (c) => c.last || 0)),
  };
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
