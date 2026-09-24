/* Shared helpers for the Netlify Functions. Files under _lib/ are not
   deployed as functions themselves; they are bundled into the ones that
   require() them.

   The functions are only ever called same-origin (/api/* on our own domain),
   so the write endpoints send no CORS headers at all. */

const SUPA_URL = process.env.SUPA_URL || 'https://boukmowybmtfqkinuvqj.supabase.co';
// The publishable (anon) key is public by design; see the RLS policies in
// supabase/migrations for what it may do.
const SUPA_ANON_KEY = process.env.SUPA_KEY || 'sb_publishable_LLpEKdQRvePMYJ5b7loUKA_SeZ51lJs';
const SUPA_SERVICE_KEY = process.env.SUPA_SERVICE_KEY || null;

const bearer = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });

/** Headers for a server-side Supabase call with the service key. The
    user-linked tables have no policies for the anon key, so there is nothing
    to fall back to: without the key every write would fail, so fail here with
    the real reason (callers catch it and log it). */
function dbHeaders() {
  if (!SUPA_SERVICE_KEY) throw new Error('SUPA_SERVICE_KEY is not set');
  return bearer(SUPA_SERVICE_KEY);
}
const anonHeaders = () => bearer(SUPA_ANON_KEY);

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
    body: JSON.stringify(body),
  };
}

/** Error response. `detail` (a Supabase error, a stack) goes to the function
    log only; clients get the short public message. */
function fail(statusCode, message, detail) {
  if (detail !== undefined) console.error(`[${statusCode}] ${message}`, detail);
  return json(statusCode, { error: message });
}

/** Monday of the week containing `date`, as YYYY-MM-DD (UTC). */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/** Verifies the caller's Supabase access token (sent as `Authorization:
    Bearer <token>` by every signed-in request) against Supabase Auth itself,
    and returns { id, email }, or null if it's missing/invalid/expired.
    This is the ONLY trustworthy source of a user's identity in these
    functions — never the device_id/user_id a client puts in a request body,
    which is trivial to spoof. A plain fetch to the auth server (what the
    Supabase SDK's getUser(token) also does under the hood) avoids adding the
    SDK as a dependency here, matching how the rest of this file talks to
    Supabase. */
async function verifyUser(event) {
  const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const res = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { apikey: SUPA_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ? { id: user.id, email: user.email || null } : null;
  } catch {
    return null;
  }
}

/** Per-user rate limit: true if `userId` may do `action` again (and records
    it), false once they've done it `max` times in the last `windowSeconds`.
    Backed by the check_rate_limit() database function. Fails open: if the
    limiter itself errors, the request is allowed rather than blocking
    everyone. */
async function allowRequest(userId, action, max, windowSeconds) {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: { ...dbHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user: userId, p_action: action, p_max: max, p_window_seconds: windowSeconds }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return (await res.json()) !== false;
  } catch (e) {
    console.error(`[rate-limit] check failed for ${action}; allowing`, e);
    return true;
  }
}

/** Parse a JSON body; returns null when it is missing, malformed or not an object. */
function parseBody(event) {
  try {
    const v = JSON.parse(event.body || 'null');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

module.exports = {
  SUPA_URL,
  dbHeaders, anonHeaders,
  json, fail, getWeekStart, parseBody, verifyUser, allowRequest,
};
