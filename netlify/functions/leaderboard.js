/* Netlify Function: weekly per-subject leaderboard
   GET  /api/leaderboard?subject=GCT           (Authorization: Bearer <token>)
     -> { top: [...top 10], my_rank: N, my_entry: {...}, week_start: 'YYYY-MM-DD' }
        Each top entry carries is_me instead of the device_id.
   POST /api/leaderboard                        (Authorization: Bearer <token>)
     body: { handle, subject, score_pct, total_questions, time_seconds }
     -> upserts entry for current week; returns updated rank

   Identity is never taken from the request body — every caller must be a
   signed-in Supabase user, verified server-side (see _lib/common#verifyUser).
   That verified id is what's stored in `device_id`, so it can't be spoofed
   or used to overwrite someone else's score.

   All reads and writes use the service key (see _lib/common.js), so the
   leaderboard_entries table needs no anon policies. */

const { SUPA_URL, dbHeaders, json, fail, getWeekStart, parseBody, verifyUser, allowRequest } = require('./_lib/common');
const { validateHandle } = require('./_lib/profanity');

// Keep in sync with `leaderboardSubject` in src/lib/subjects.js.
const SUBJECTS = [
  'GCT',
  'Medical Chemistry',
  'Medical Physics',
  'Clinical & Professional Skills',
  'Body Systems',
  'Medicine & Art',
  'GCT II',
  'Body Systems II',
  'Clinical & Professional Skills II',
  'Medicine & Art II',
];
const EXAM_QUESTIONS = 30;

const rest = (path, init = {}) =>
  fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

async function getWeeklyTop(subject, weekStart, limit = 10) {
  const res = await rest(
    `/leaderboard_entries?subject=eq.${encodeURIComponent(subject)}`
    + `&week_start=eq.${weekStart}`
    + `&select=handle,score_pct,total_questions,time_seconds,completed_at,device_id`
    + `&order=score_pct.desc,time_seconds.asc,completed_at.asc`
    + `&limit=${limit}`
  );
  if (!res.ok) throw new Error(`read failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getMyEntry(subject, weekStart, deviceId) {
  const res = await rest(
    `/leaderboard_entries?subject=eq.${encodeURIComponent(subject)}`
    + `&week_start=eq.${weekStart}`
    + `&device_id=eq.${encodeURIComponent(deviceId)}`
    + `&select=*`
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

/* Rank follows the board order: score desc, then time asc (entries with no
   time sort after timed ones), then earliest completion. */
async function getMyRank(subject, weekStart, mine) {
  if (!mine) return null;
  const score = Number(mine.score_pct);
  const better = mine.time_seconds != null
    ? `score_pct.gt.${score},and(score_pct.eq.${score},time_seconds.lt.${Number(mine.time_seconds)})`
    : `score_pct.gt.${score},and(score_pct.eq.${score},time_seconds.not.is.null),`
      + `and(score_pct.eq.${score},time_seconds.is.null,completed_at.lt.${encodeURIComponent(mine.completed_at)})`;
  const res = await rest(
    `/leaderboard_entries?subject=eq.${encodeURIComponent(subject)}`
    + `&week_start=eq.${weekStart}&or=(${better})&select=id`,
    { headers: { Prefer: 'count=exact', Range: '0-0' } }
  );
  if (!res.ok) return null;
  const total = parseInt((res.headers.get('content-range') || '').split('/')[1], 10);
  return Number.isFinite(total) ? total + 1 : null;
}

/* A new result replaces the old one only if it scores higher, or ties on
   score and is provably faster (both times known). */
function isBetter(next, prev) {
  if (next.score_pct !== Number(prev.score_pct)) return next.score_pct > Number(prev.score_pct);
  return next.time_seconds != null && prev.time_seconds != null && next.time_seconds < prev.time_seconds;
}

async function upsertEntry(payload) {
  const existing = await getMyEntry(payload.subject, payload.week_start, payload.device_id);

  if (existing) {
    if (!isBetter(payload, existing)) return { action: 'kept_existing', entry: existing };
    const res = await rest(`/leaderboard_entries?id=eq.${existing.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        handle: payload.handle,
        score_pct: payload.score_pct,
        total_questions: payload.total_questions,
        time_seconds: payload.time_seconds,
        completed_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) throw new Error(`update failed: ${res.status} ${await res.text()}`);
    return { action: 'updated', entry: (await res.json())[0] };
  }

  const res = await rest('/leaderboard_entries', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...payload, completed_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    // Lost a race with a parallel submission (unique device+subject+week):
    // treat it as "kept existing" instead of surfacing a 500.
    if (res.status === 409) {
      const raced = await getMyEntry(payload.subject, payload.week_start, payload.device_id);
      if (raced) return { action: 'kept_existing', entry: raced };
    }
    throw new Error(`insert failed: ${res.status} ${await res.text()}`);
  }
  return { action: 'inserted', entry: (await res.json())[0] };
}

const publicEntry = (e) => (e ? { ...e, device_id: undefined } : e);

exports.handler = async (event) => {
  // Same-origin only: no CORS headers, preflights get an empty 204.
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  try {
    if (event.httpMethod === 'GET') {
      const { subject } = event.queryStringParameters || {};
      if (!SUBJECTS.includes(subject)) return fail(400, 'Unknown subject');

      const weekStart = getWeekStart();
      const top = await getWeeklyTop(subject, weekStart, 10);
      const myEntry = await getMyEntry(subject, weekStart, caller.id);
      const myRank = myEntry ? await getMyRank(subject, weekStart, myEntry) : null;
      return json(200, {
        week_start: weekStart,
        top: top.map((e) => ({ ...publicEntry(e), is_me: e.device_id === caller.id })),
        my_entry: publicEntry(myEntry),
        my_rank: myRank,
      });
    }

    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      if (!body) return fail(400, 'Body must be a JSON object');

      const handleError = validateHandle(body.handle);
      if (handleError) return fail(400, handleError);
      if (!SUBJECTS.includes(body.subject)) return fail(400, 'Unknown subject');
      if (Number(body.total_questions) !== EXAM_QUESTIONS) {
        return fail(400, `Leaderboard requires exactly ${EXAM_QUESTIONS} questions`);
      }
      const score = Number(body.score_pct);
      if (!Number.isFinite(score) || score < 0 || score > 100) return fail(400, 'score_pct must be 0-100');

      let time = null;
      if (body.time_seconds != null) {
        time = Math.round(Number(body.time_seconds));
        // A 30-question exam can't be finished in under a minute or take a day.
        if (!Number.isFinite(time) || time < 60 || time > 86400) time = null;
      }

      if (!(await allowRequest(caller.id, 'leaderboard_post', 20, 3600))) {
        return fail(429, 'Too many submissions — please try again later');
      }

      const weekStart = getWeekStart();
      const result = await upsertEntry({
        device_id: caller.id,
        handle: body.handle.trim(),
        subject: body.subject,
        score_pct: Math.round(score * 100) / 100,
        total_questions: EXAM_QUESTIONS,
        time_seconds: time,
        week_start: weekStart,
      });
      const myRank = await getMyRank(body.subject, weekStart, result.entry);
      return json(200, {
        action: result.action,
        entry: publicEntry(result.entry),
        my_rank: myRank,
        week_start: weekStart,
      });
    }

    return fail(405, 'Method not allowed');
  } catch (e) {
    return fail(500, 'Leaderboard is unavailable right now', e);
  }
};
