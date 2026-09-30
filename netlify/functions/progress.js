/* Netlify Function: a student's study progress, saved to their account
   GET /api/progress                 (Authorization: Bearer <token>)
     -> { rows: [{ prefix, version, updated_at }] }   every subject, no data
   GET /api/progress?prefix=gct      -> { row: { prefix, version, data } | null }
   PUT /api/progress   body: { prefix, base, data }
     -> 200 { version }                        saved as version base+1
     -> 409 { error, current: { version, data } }
          someone else (another device) saved since `base`: the client merges
          `current` into its copy and tries again with base = current.version

   `data` is one subject's localStorage progress (see src/lib/progressSync.js):
   { history: [], wrong: {}, cleared: {}, flashcards: {} }. Only those four
   keys are kept, and the whole thing is size-capped. Rows are keyed by the
   verified caller, never by anything in the request. */

const { SUPA_URL, dbHeaders, json, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');

const PREFIX = /^[a-z0-9_]{1,20}$/;
const MAX_BYTES = 1_500_000;

const rest = (path, init = {}) =>
  fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

const isMap = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function cleanData(d) {
  if (!isMap(d)) return null;
  return {
    history: Array.isArray(d.history) ? d.history : [],
    wrong: isMap(d.wrong) ? d.wrong : {},
    cleared: isMap(d.cleared) ? d.cleared : {},
    flashcards: isMap(d.flashcards) ? d.flashcards : {},
  };
}

async function readRow(userId, prefix, cols) {
  const res = await rest(`/user_progress?user_id=eq.${encodeURIComponent(userId)}&prefix=eq.${prefix}&select=${cols}`);
  if (!res.ok) throw new Error(`read ${res.status} ${await res.text()}`);
  return (await res.json())[0] || null;
}

async function save(userId, prefix, base, data) {
  const now = new Date().toISOString();
  let res;
  if (!base) {
    // First save for this subject; if a row already exists, it's a conflict.
    res = await rest('/user_progress?on_conflict=user_id,prefix', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ user_id: userId, prefix, data, version: 1, updated_at: now }),
    });
  } else {
    res = await rest(`/user_progress?user_id=eq.${encodeURIComponent(userId)}&prefix=eq.${prefix}&version=eq.${base}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ data, version: base + 1, updated_at: now }),
    });
  }
  if (!res.ok) throw new Error(`save ${res.status} ${await res.text()}`);
  const [row] = await res.json();
  return row ? row.version : null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  try {
    if (event.httpMethod === 'GET') {
      const prefix = event.queryStringParameters?.prefix;
      if (prefix === undefined) {
        const res = await rest(`/user_progress?user_id=eq.${encodeURIComponent(caller.id)}&select=prefix,version,updated_at`);
        if (!res.ok) return fail(502, 'Could not load progress', `${res.status} ${await res.text()}`);
        return json(200, { rows: await res.json() });
      }
      if (!PREFIX.test(prefix)) return fail(400, 'Invalid subject');
      return json(200, { row: await readRow(caller.id, prefix, 'prefix,version,data') });
    }

    if (event.httpMethod === 'PUT') {
      if ((event.body || '').length > MAX_BYTES) return fail(413, 'Progress is too large to save');
      const body = parseBody(event);
      if (!body) return fail(400, 'Body must be a JSON object');
      const { prefix } = body;
      const base = body.base === null || body.base === undefined ? 0 : Number(body.base);
      const data = cleanData(body.data);
      if (!PREFIX.test(prefix || '') || !Number.isInteger(base) || base < 0 || !data) return fail(400, 'Missing or invalid fields');

      if (!(await allowRequest(caller.id, 'progress', 300, 3600))) return fail(429, 'Too many requests');

      const version = await save(caller.id, prefix, base, data);
      if (version !== null) return json(200, { version });
      const current = await readRow(caller.id, prefix, 'version,data');
      return json(409, { error: 'Changed on another device', current });
    }

    return fail(405, 'Method not allowed');
  } catch (e) {
    return fail(500, 'Progress is unavailable right now', e);
  }
};
