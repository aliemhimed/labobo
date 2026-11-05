/* Netlify Function: record study-mode and flashcard answers
   POST /api/study   (Authorization: Bearer <token>)
     body: { tz, items: [{ id: "<table>:<row id>", topic, mode: "study"|"flashcards", correct }] }

   Practice sets and exams reach the dashboard when they're finished
   (sessions, answers.js). Study mode and flashcards have no "finish", so the
   app sends their answers in small batches as the student goes (see
   src/lib/study.js). Counted per student, day, question bank and topic by
   record_study(), and read by the admin dashboard. "Today" is the student's
   own calendar day in `tz`; without a usable zone it's the UTC day. */

const { SUPA_URL, dbHeaders, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');

const MAX_ITEMS = 100;
const QUESTION_ID = /^[a-z0-9_]{1,63}:\d{1,19}$/;
const MODES = new Set(['study', 'flashcards']);

function zone(tz) {
  if (typeof tz !== 'string' || tz.length > 64 || !/^[A-Za-z]+(?:[/_+-][A-Za-z0-9]+)*$/.test(tz)) return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

const record = (userId, tz, mode, items) =>
  fetch(`${SUPA_URL}/rest/v1/rpc/record_study`, {
    method: 'POST',
    headers: { ...dbHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user: userId, p_tz: tz, p_mode: mode, p_items: items }),
  });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  const body = parseBody(event);
  if (!body || !Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    return fail(400, `items must be a list of 1-${MAX_ITEMS} answers`);
  }

  const byMode = new Map();
  for (const x of body.items) {
    if (!x || typeof x.id !== 'string' || !QUESTION_ID.test(x.id) || !MODES.has(x.mode)) continue;
    const topic = typeof x.topic === 'string' ? x.topic.trim().slice(0, 120) : '';
    const list = byMode.get(x.mode) || [];
    list.push({ id: x.id, topic: topic || 'General', correct: x.correct === true });
    byMode.set(x.mode, list);
  }
  if (!byMode.size) return fail(400, 'No valid answers');

  // The app sends a batch every ~10 answers or so; this is only a backstop.
  if (!(await allowRequest(caller.id, 'study', 400, 3600))) return fail(429, 'Too many requests');

  try {
    const tz = zone(body.tz);
    for (const [mode, items] of byMode) {
      let res = await record(caller.id, tz, mode, items);
      // A zone Node knows but Postgres doesn't: count it on the UTC day instead.
      if (!res.ok && tz !== 'UTC') res = await record(caller.id, 'UTC', mode, items);
      if (!res.ok) return fail(502, 'Could not record', `${res.status} ${await res.text()}`);
    }
    return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
  } catch (e) {
    return fail(500, 'Could not record', e);
  }
};
