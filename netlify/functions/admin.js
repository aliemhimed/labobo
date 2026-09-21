/* Netlify Function: admin — password-gated dashboard backend.
   Routes (all but login need `Authorization: Bearer <token>`):
     POST   /api/admin?action=login                body: {password} -> {token}
     GET    /api/admin?action=stats
     GET    /api/admin?action=reports
     GET    /api/admin?action=leaderboard[&week=YYYY-MM-DD]
     GET    /api/admin?action=users
     GET    /api/admin?action=sessions[&limit=N]
     GET    /api/admin?action=announcements        (includes hidden ones)
     POST   /api/admin?action=announcement         body: {id,title,body,pub_date,active}
     DELETE /api/admin?action=leaderboard&id=N
     DELETE /api/admin?action=report&id=N
     DELETE /api/admin?action=announcement&id=SLUG
     DELETE /api/admin?action=session&id=UUID
     DELETE /api/admin?action=user&id=UUID

   The public site reads announcements from /api/announcements instead,
   which is unauthenticated and only returns active ones.

   ENV VARS (set in Netlify dashboard):
     ADMIN_PASSWORD   — required. Exchanged for a short-lived token by the login action.
                        There is no default: without it the endpoint returns 503.
    SUPA_SERVICE_KEY — required for write actions (POST/DELETE). Found in
              Supabase → Settings → API → "service_role secret".
              NEVER expose to client.
   Without SUPA_SERVICE_KEY, only the simple read actions work.
*/

const crypto = require('crypto');
const { SUPA_URL, anonHeaders, serviceHeaders, json, fail, getWeekStart, isIsoDate, parseBody } = require('./_lib/common');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

const SERVICE_KEY_HINT =
  'SUPA_SERVICE_KEY not set on Netlify. Add it under Site → Site settings → Environment variables, ' +
  'then redeploy. Find the key in Supabase → Settings → API → "service_role" secret.';

const publicHeaders = anonHeaders;
const adminHeaders = serviceHeaders;
const ok = (body) => json(200, body);
const err = (status, msg) => fail(status, msg);

/* ---------- auth ----------
   POST ?action=login {password} -> {token}. The token is "<expiry>.<hmac>"
   signed with a key derived from ADMIN_PASSWORD, so the browser never has to
   keep (or resend) the password itself, and changing the password revokes
   every outstanding token. There is no fallback password: without
   ADMIN_PASSWORD the endpoint refuses to work. */

const sha256 = (s) => crypto.createHash('sha256').update(s).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha256(a), sha256(b));
const signingKey = () => sha256(`labobo-admin-token:${ADMIN_PASSWORD}`);
const sign = (payload) => crypto.createHmac('sha256', signingKey()).update(payload).digest('hex');

function issueToken() {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

function tokenValid(token) {
  if (!ADMIN_PASSWORD || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return safeEqual(sig, sign(exp));
}

/* Best-effort brute-force brake. Function instances are ephemeral, so this
   only slows a guesser down per warm instance; it is not a hard limit. */
const attempts = new Map(); // ip -> { fails, until }
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

function clientIp(event) {
  const h = event.headers || {};
  return h['x-nf-client-connection-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}
const isLocked = (ip) => (attempts.get(ip)?.until || 0) > Date.now();
function recordFailure(ip) {
  const a = attempts.get(ip) || { fails: 0, until: 0 };
  a.fails += 1;
  if (a.fails >= MAX_FAILS) { a.until = Date.now() + LOCK_MS; a.fails = 0; }
  attempts.set(ip, a);
}

async function rest(path, init = {}, asAdmin = false) {
  const baseHeaders = asAdmin ? adminHeaders() : publicHeaders();
  if (asAdmin && !baseHeaders) {
    throw new Error('SUPA_SERVICE_KEY env var not set on Netlify — required for this action.');
  }
  const res = await fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...baseHeaders, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase ${init.method || 'GET'} ${path} → ${res.status}: ${txt}`);
  }
  if (res.status === 204) return null;
  // Prefer: return=minimal yields an empty body; res.json() would throw.
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function countTable(table, filter = '') {
  // users/sessions/question_reports have no anon SELECT policy, so count as admin.
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?select=id${filter}`, {
    headers: { ...(adminHeaders() || publicHeaders()), 'Prefer': 'count=exact', 'Range': '0-0' }
  });
  const range = res.headers.get('content-range');
  if (!range) return null;
  const total = parseInt(range.split('/')[1], 10);
  return Number.isFinite(total) ? total : null;
}

exports.handler = async (event) => {
  // Same-origin only: no CORS headers, preflights get an empty 204.
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };

  if (!ADMIN_PASSWORD) return err(503, 'Admin is not configured (ADMIN_PASSWORD is not set).');

  const ip = clientIp(event);
  const params = event.queryStringParameters || {};

  if (event.httpMethod === 'POST' && params.action === 'login') {
    if (isLocked(ip)) return err(429, 'Too many attempts. Try again later.');
    const body = parseBody(event);
    if (!body || typeof body.password !== 'string' || !safeEqual(body.password, ADMIN_PASSWORD)) {
      recordFailure(ip);
      return err(401, 'Unauthorized');
    }
    attempts.delete(ip);
    return ok({ token: issueToken(), expires_in: TOKEN_TTL_MS / 1000 });
  }

  const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
  if (!tokenValid(auth.replace(/^Bearer\s+/i, ''))) return err(401, 'Unauthorized');

  const action = params.action;

  try {
    // ============ READ ACTIONS ============
    if (event.httpMethod === 'GET') {
      if (action === 'stats') {
        const weekStart = getWeekStart();
        const [users, sessions, reports, lbThisWeek, sessionsToday] = await Promise.all([
          countTable('users'),
          countTable('sessions'),
          countTable('question_reports'),
          countTable('leaderboard_entries', `&week_start=eq.${weekStart}`),
          (async () => {
            const today = new Date().toISOString().slice(0, 10);
            return await countTable('sessions', `&created_at=gte.${today}T00:00:00Z`);
          })()
        ]);
        return ok({ users, sessions, sessions_today: sessionsToday, reports, leaderboard_this_week: lbThisWeek, week_start: weekStart });
      }

      if (action === 'reports') {
        const rows = await rest('/question_reports?select=*&order=created_at.desc.nullslast,id.desc&limit=500', {}, true);
        return ok({ rows });
      }

      if (action === 'leaderboard') {
        const week = params.week || getWeekStart();
        if (!isIsoDate(week)) return err(400, 'week must be YYYY-MM-DD');
        const rows = await rest(`/leaderboard_entries?week_start=eq.${week}&select=*&order=score_pct.desc,time_seconds.asc,completed_at.asc&limit=500`);
        // Also list distinct weeks available
        const weeksRaw = await rest('/leaderboard_entries?select=week_start&order=week_start.desc&limit=1000');
        const weeks = [...new Set((weeksRaw || []).map(r => r.week_start))];
        return ok({ rows, weeks, week_start: week });
      }

      if (action === 'users') {
        const rows = await rest('/users?select=*&order=joined.desc.nullslast&limit=1000', {}, true);
        return ok({ rows });
      }

      if (action === 'sessions') {
        const limit = Math.min(parseInt(params.limit || '100', 10), 500);
        const rows = await rest(`/sessions?select=*&order=created_at.desc.nullslast&limit=${limit}`, {}, true);
        return ok({ rows });
      }

      if (action === 'announcements') {
        // Read as admin: the anon policy only exposes active rows, and the
        // dashboard needs to see hidden ones too.
        if (!adminHeaders()) return err(503, SERVICE_KEY_HINT);
        const rows = await rest(
          '/announcements?select=*&order=pub_date.desc,created_at.desc&limit=500',
          {},
          true
        );
        return ok({ rows });
      }

      return err(400, `Unknown GET action: ${action}`);
    }

    // ============ WRITE ==========
    if (event.httpMethod === 'POST') {
      if (action === 'announcement') {
        if (!adminHeaders()) return err(503, SERVICE_KEY_HINT);

        let payload;
        try { payload = JSON.parse(event.body || '{}'); }
        catch { return err(400, 'Body is not valid JSON'); }

        const id = String(payload.id || '').trim();
        const title = String(payload.title || '').trim();
        const body = String(payload.body || '').trim();
        if (!id) return err(400, 'Missing id');
        if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) return err(400, 'id must be a lowercase slug (a-z, 0-9, -)');
        if (!title) return err(400, 'Missing title');
        if (title.length > 200) return err(400, 'Title is too long (max 200)');
        if (!body) return err(400, 'Missing body');
        if (body.length > 5000) return err(400, 'Body is too long (max 5000)');
        if (payload.pub_date && !isIsoDate(payload.pub_date)) return err(400, 'pub_date must be YYYY-MM-DD');

        const row = {
          id,
          title,
          body,
          pub_date: payload.pub_date || new Date().toISOString().slice(0, 10),
          active: payload.active !== false,
        };

        // Upsert, so the dashboard's Save button both creates and edits.
        const saved = await rest('/announcements', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(row),
        }, true);

        return ok({ saved: Array.isArray(saved) ? saved[0] : saved });
      }

      return err(400, `Unknown POST action: ${action}`);
    }

    // ============ DELETE ACTIONS ============
    if (event.httpMethod === 'DELETE') {
      if (!adminHeaders()) {
        return err(503, SERVICE_KEY_HINT);
      }

      const id = params.id;
      if (!id) return err(400, 'Missing id');

      if (action === 'leaderboard') {
        await rest(`/leaderboard_entries?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
        return ok({ deleted: 'leaderboard_entries', id });
      }
      if (action === 'report') {
        await rest(`/question_reports?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
        return ok({ deleted: 'question_reports', id });
      }
      if (action === 'session') {
        await rest(`/sessions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
        return ok({ deleted: 'sessions', id });
      }
      if (action === 'user') {
        await rest(`/users?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
        return ok({ deleted: 'users', id });
      }
      if (action === 'announcement') {
        await rest(`/announcements?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
        return ok({ deleted: 'announcements', id });
      }
      return err(400, `Unknown DELETE action: ${action}`);
    }

    return err(405, 'Method not allowed');
  } catch (e) {
    return fail(500, 'Request failed', e);
  }
};
