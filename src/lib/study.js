/* Sends study-mode and flashcard answers to /api/study so the admin
   dashboard can see what students study (see netlify/functions/study.js).

   Answers wait in a small queue, mirrored to localStorage, and go out in
   batches: every BATCH answers, after a short pause, and when the tab is
   hidden. Anything that couldn't be sent (offline, signed out for a moment)
   stays queued and goes with the next batch, or on the next visit.
   Fire and forget: tracking must never get in the way of studying. */
import { authHeader } from './supabaseClient.js';

const KEY = 'labobo.studyQueue';
const BATCH = 10;
const MAX_SEND = 100; // the server takes at most 100 per request
const MAX_KEEP = 500; // never let an offline queue grow without bound
const IDLE_MS = 20_000;

const TIME_ZONE = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
})();

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

let queue = load();
let timer = null;
let sending = false;

function save() {
  try {
    if (queue.length) localStorage.setItem(KEY, JSON.stringify(queue));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode or storage full: the in-memory queue still works */
  }
}

async function flush(keepalive = false) {
  clearTimeout(timer);
  timer = null;
  if (sending || !queue.length) return;
  sending = true;
  let sent = false;
  const batch = queue.slice(0, MAX_SEND);
  try {
    const auth = await authHeader();
    if (!auth.Authorization) return; // signed out: keep them for later
    const res = await fetch('/api/study', {
      method: 'POST',
      keepalive,
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ tz: TIME_ZONE, items: batch }),
    });
    // Sent, or rejected for good (bad data): either way don't resend it.
    // Rate limits and server errors keep the batch for the next try.
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) {
      queue = queue.slice(batch.length);
      save();
      sent = true;
    }
  } catch {
    /* offline or functions not running: retried with the next batch */
  } finally {
    sending = false;
  }
  // A backlog (from an offline stretch) goes out in a few requests in a row,
  // but only while sending works; a failure waits for the next answer.
  if (sent && queue.length >= BATCH && !keepalive) flush();
}

/** Records one answer. `mode` is 'study' or 'flashcards'; `correct` is
    whether the student got it right (flashcards: anything but "Again"). */
export function trackStudy(mode, question, correct) {
  if (!question?.id) return;
  queue.push({ id: question.id, topic: String(question.topic || '').slice(0, 120), mode, correct: !!correct });
  if (queue.length > MAX_KEEP) queue = queue.slice(-MAX_KEEP);
  save();
  if (queue.length >= BATCH) flush();
  else if (!timer) timer = setTimeout(() => flush(), IDLE_MS);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', () => flush(true));
  // Whatever an earlier visit couldn't send.
  if (queue.length) timer = setTimeout(() => flush(), 5_000);
}
