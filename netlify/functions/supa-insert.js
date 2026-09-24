/* Netlify Function: proxy inserts to Supabase
   Why: ad blockers (uBlock, AdGuard, Brave) block *.supabase.co directly, so
   the browser posts to our own domain instead.

   POST /api/supa-insert   (Authorization: Bearer <token>)   body: { table, data }

   Every caller must be a signed-in Supabase user (verified server-side, see
   _lib/common#verifyUser). `device_id` is never taken from the client — it's
   always overwritten with the caller's verified id, so nobody can write rows
   under someone else's identity.

   Only the tables below are writable and only through their per-column
   rules: unknown columns are dropped, strings are length-capped, and one row
   per request. Inserts use the service key (see _lib/common.js), so the
   tables need no anon INSERT policy. Each user is rate-limited per table
   (RATE_LIMITS below). */

const { SUPA_URL, dbHeaders, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');

const str = (max) => (v) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const int = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.round(Number(v)) : undefined);
const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : undefined);
const timestamp = (v) => (typeof v === 'string' && !isNaN(new Date(v)) ? new Date(v).toISOString() : undefined);
// "<table>:<row id>", the app's stable question id (src/lib/questions.js).
const questionId = (v) => (typeof v === 'string' && /^[a-z0-9_]{1,63}:\d{1,19}$/.test(v) ? v : undefined);

// Allowed columns per table. ids, created_at and device_id come from the
// server, never the client (device_id is filled in from the verified caller
// after cleaning — see below).
const SCHEMAS = {
  sessions: {
    required: [],
    columns: {
      subject: str(120), mode: str(30),
      score: int, total: int, pct: num,
    },
  },
  question_reports: {
    required: ['question_text', 'reason'],
    columns: {
      question_id: questionId, question_text: str(2000), subject: str(120), topic: str(200),
      reason: str(100), note: str(500), reported_at: timestamp,
    },
  },
};

// Per user, per table: at most `max` rows every `windowSeconds`.
const RATE_LIMITS = {
  question_reports: { action: 'report', max: 20, windowSeconds: 3600 },
  sessions: { action: 'session', max: 120, windowSeconds: 3600 },
};

function clean(schema, data) {
  const row = {};
  for (const [col, coerce] of Object.entries(schema.columns)) {
    if (data[col] === undefined || data[col] === null) continue;
    const v = coerce(data[col]);
    if (v !== undefined) row[col] = v;
  }
  return schema.required.every((c) => row[c] !== undefined && row[c] !== '') ? row : null;
}

exports.handler = async (event) => {
  // Same-origin only: no CORS headers, preflights get an empty 204.
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  const body = parseBody(event);
  if (!body) return fail(400, 'Body must be a JSON object');

  const schema = Object.prototype.hasOwnProperty.call(SCHEMAS, body.table) ? SCHEMAS[body.table] : null;
  if (!schema) return fail(403, 'Table not allowed');
  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
    return fail(400, 'data must be a single object');
  }

  const row = clean(schema, body.data);
  if (!row) return fail(400, 'Missing or invalid fields');
  row.device_id = caller.id;

  const limit = RATE_LIMITS[body.table];
  if (!(await allowRequest(caller.id, limit.action, limit.max, limit.windowSeconds))) {
    return fail(429, 'Too many requests — please try again later');
  }

  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${body.table}`, {
      method: 'POST',
      headers: { ...dbHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) return fail(502, 'Could not save', `${body.table} ${res.status} ${await res.text()}`);
    return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
  } catch (e) {
    return fail(500, 'Could not save', e);
  }
};
