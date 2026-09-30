/* Keeps each subject's study progress (history, wrong answers, flashcards)
   in the student's account as well as in this browser, so a new phone or a
   cleared browser doesn't lose it. See netlify/functions/progress.js.

   - On sign-in: ask the server which subjects changed since this device last
     synced (one small request), download just those and merge them in, then
     upload anything changed here.
   - After a local change: upload that subject a couple of seconds later.
   - Coming back to the tab, or back online: check again.
   - Before signing out: flush pending uploads.

   Every upload names the version it was based on; if another device saved
   in between, the server answers 409 with its copy, which is merged in and
   the upload retried. Merging never drops a finished quiz (progressMerge.js).

   Bookkeeping lives under `labobo.sync`: which account this browser's
   progress belongs to, the last synced version of each subject, and which
   subjects have changes not yet uploaded. */
import { SUBJECTS } from './subjects.js';
import { authHeader } from './supabaseClient.js';
import { applyProgress, clearProgress, onProgressChange, readProgress } from './storage.js';
import { isEmptyProgress, mergeProgress, sameProgress } from './progressMerge.js';

const META_KEY = 'labobo.sync';
const PREFIXES = [...new Set(Object.values(SUBJECTS).map((s) => s.storagePrefix))];
const PUSH_DELAY_MS = 2500;
const RECHECK_MS = 60_000;
const MAX_TRIES = 3;

let meta = { owner: null, v: {}, dirty: {} };
let userId = null;
let pushTimer = null;
let lastSyncAt = 0;
const edits = {}; // prefix -> local changes seen, so an edit made mid-upload stays dirty

function loadMeta() {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) || 'null');
    meta = { owner: m?.owner || null, v: m?.v || {}, dirty: m?.dirty || {} };
  } catch {
    meta = { owner: null, v: {}, dirty: {} };
  }
}
function saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* full or blocked */ }
}

/* One operation at a time, so an upload and a download of the same subject
   never interleave. A failure is logged and retried on the next change or
   visit; it never reaches the UI. */
let queue = Promise.resolve();
function run(fn) {
  queue = queue.then(fn).catch((e) => console.warn('[sync]', e?.message || e));
  return queue;
}

async function api(method, query = '', body) {
  const headers = { ...(await authHeader()) };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api/progress${query}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/* Fold the account's copy into this device's and remember its version.
   Marks the subject dirty when this device has something the account lacks. */
function absorb(prefix, remote) {
  const local = readProgress(prefix);
  const merged = mergeProgress(local, remote.data);
  if (!sameProgress(merged, local)) applyProgress(prefix, merged);
  meta.v[prefix] = remote.version;
  if (!sameProgress(merged, mergeProgress(remote.data, {}))) meta.dirty[prefix] = true;
  saveMeta();
}

async function pull(prefix) {
  const res = await api('GET', `?prefix=${prefix}`);
  if (!res.ok) throw new Error(`download ${prefix}: ${res.status}`);
  if (res.data.row) absorb(prefix, res.data.row);
}

async function push(prefix) {
  for (let i = 0; i < MAX_TRIES; i++) {
    const seen = edits[prefix] || 0;
    const res = await api('PUT', '', { prefix, base: meta.v[prefix] || 0, data: readProgress(prefix) });
    if (res.ok) {
      meta.v[prefix] = res.data.version;
      if ((edits[prefix] || 0) === seen) delete meta.dirty[prefix];
      saveMeta();
      return;
    }
    if (res.status !== 409) throw new Error(`upload ${prefix}: ${res.status}`);
    // Another device saved first: merge its copy in and go again.
    if (res.data.current) absorb(prefix, res.data.current);
    else { meta.v[prefix] = 0; saveMeta(); }
  }
  throw new Error(`upload ${prefix}: kept conflicting`);
}

async function flushDirty() {
  if (!userId) return;
  for (const prefix of Object.keys(meta.dirty)) {
    if (PREFIXES.includes(prefix)) await push(prefix);
    else delete meta.dirty[prefix];
  }
}

async function syncAll() {
  if (!userId) return;
  lastSyncAt = Date.now();
  const res = await api('GET');
  if (!res.ok) throw new Error(`check: ${res.status}`);
  const remote = new Map((res.data.rows || []).map((r) => [r.prefix, r.version]));
  for (const prefix of PREFIXES) {
    const rv = remote.get(prefix) || 0;
    if (rv === (meta.v[prefix] || 0)) continue;
    if (rv) await pull(prefix);
    else {
      // Gone from the account (never saved, or removed): upload ours.
      meta.v[prefix] = 0;
      if (!isEmptyProgress(readProgress(prefix))) meta.dirty[prefix] = true;
      saveMeta();
    }
  }
  await flushDirty();
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; run(flushDirty); }, PUSH_DELAY_MS);
}

onProgressChange((prefix) => {
  edits[prefix] = (edits[prefix] || 0) + 1;
  meta.dirty[prefix] = true;
  saveMeta();
  if (userId) schedulePush();
});

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; run(flushDirty); }
  } else if (Date.now() - lastSyncAt > RECHECK_MS) {
    run(syncAll);
  }
}
const onOnline = () => run(syncAll);

/** Start syncing for the signed-in user; returns a stop function. */
export function startProgressSync(id) {
  loadMeta();
  if (meta.owner && meta.owner !== id) {
    // Another account's progress is on this browser: it's in that account
    // already, so start this one from a clean slate.
    PREFIXES.forEach(clearProgress);
    meta = { owner: id, v: {}, dirty: {} };
  } else if (!meta.owner) {
    // First sync on this browser: whatever is here belongs to this student.
    meta.owner = id;
    PREFIXES.forEach((p) => { if (!isEmptyProgress(readProgress(p))) meta.dirty[p] = true; });
  }
  saveMeta();
  userId = id;

  run(syncAll);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
    clearTimeout(pushTimer);
    pushTimer = null;
    userId = null;
  };
}

/** Upload anything pending (before signing out). Gives up after a few
    seconds rather than hold the sign-out hostage to a bad connection. */
export function flushProgress(timeoutMs = 4000) {
  if (!userId) return Promise.resolve();
  clearTimeout(pushTimer);
  pushTimer = null;
  return Promise.race([
    run(flushDirty),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
