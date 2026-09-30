/* Merging two copies of one subject's progress (this device's and the
   account's), so studying on a phone and a laptop adds up instead of one
   overwriting the other. Pure functions; progressSync.js does the I/O.

   Shape (see storage.js):
     history     [{ id, date, ... }]              finished sets, newest first
     wrong       { qid: [{ date, examId, selected }] }
     cleared     { qid: ISO date }                last answered correctly
     flashcards  { qid: { due, last, ... } } */

const HISTORY_MAX = 200;
const WRONG_ATTEMPTS_MAX = 10;

const maxDate = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

function mergeHistory(a = [], b = []) {
  const byId = new Map();
  for (const r of [...a, ...b]) {
    if (!r) continue;
    const key = r.id || r.date;
    if (key && !byId.has(key)) byId.set(key, r);
  }
  return [...byId.values()]
    .sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')))
    .slice(0, HISTORY_MAX);
}

/* A question is on the wrong list if it was missed *after* it was last
   answered correctly on any device. Attempts from both sides are pooled. */
function mergeWrong(wa = {}, wb = {}, ca = {}, cb = {}) {
  const wrong = {};
  const cleared = {};
  const ids = new Set([...Object.keys(wa), ...Object.keys(wb), ...Object.keys(ca), ...Object.keys(cb)]);
  for (const id of ids) {
    const clearedAt = maxDate(ca[id], cb[id]);
    if (clearedAt) cleared[id] = clearedAt;
    const seen = new Set();
    const attempts = [...(wa[id] || []), ...(wb[id] || [])]
      .filter((t) => {
        const k = `${t?.examId}|${t?.date}`;
        if (!t || seen.has(k)) return false;
        seen.add(k);
        return !clearedAt || String(t.date || '') > clearedAt;
      })
      .sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')))
      .slice(-WRONG_ATTEMPTS_MAX);
    if (attempts.length) wrong[id] = attempts;
  }
  return { wrong, cleared };
}

/* Per card, the most recently reviewed copy wins. */
function mergeFlashcards(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, card] of Object.entries(b)) {
    if (!out[id] || (card?.last || 0) > (out[id]?.last || 0)) out[id] = card;
  }
  return out;
}

export function mergeProgress(a = {}, b = {}) {
  return {
    history: mergeHistory(a.history, b.history),
    ...mergeWrong(a.wrong, b.wrong, a.cleared, b.cleared),
    flashcards: mergeFlashcards(a.flashcards, b.flashcards),
  };
}

/** Key-order-independent JSON, for "did the merge change anything?". */
export function sameProgress(a, b) {
  return stable(a) === stable(b);
}
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

export const isEmptyProgress = (d) =>
  !d || (!d.history?.length && !Object.keys(d.wrong || {}).length
    && !Object.keys(d.cleared || {}).length && !Object.keys(d.flashcards || {}).length);
