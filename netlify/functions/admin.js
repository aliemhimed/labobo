/* Netlify Function: admin — password-gated dashboard backend.
   Routes (all gated by X-Admin-Password header):
     GET    /api/admin?action=stats
     GET    /api/admin?action=reports
     GET    /api/admin?action=leaderboard[&week=YYYY-MM-DD]
     GET    /api/admin?action=users
     GET    /api/admin?action=sessions[&limit=N]
     DELETE /api/admin?action=leaderboard&id=N
     DELETE /api/admin?action=report&id=N

   ENV VARS (set in Netlify dashboard):
     ADMIN_PASSWORD   — required. The password the admin page sends in X-Admin-Password.
    SUPA_SERVICE_KEY — required for write actions (POST/DELETE). Found in
              Supabase → Settings → API → "service_role secret".
              NEVER expose to client.
   Without SUPA_SERVICE_KEY, only the simple read actions work.
*/

const SUPA_URL = 'https://boukmowybmtfqkinuvqj.supabase.co';
const SUPA_KEY = 'sb_publishable_LLpEKdQRvePMYJ5b7loUKA_SeZ51lJs';
const SUPA_SERVICE_KEY = process.env.SUPA_SERVICE_KEY || null;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CHANGE_ME_labobo_admin';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  'Cache-Control': 'no-store'
};

function publicHeaders() {
  return { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` };
}
function adminHeaders() {
  if (!SUPA_SERVICE_KEY) return null;
  return { 'apikey': SUPA_SERVICE_KEY, 'Authorization': `Bearer ${SUPA_SERVICE_KEY}` };
}

function ok(body) {
  return {
    statusCode: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}
function err(status, msg) {
  return {
    statusCode: status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: msg })
  };
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
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?select=id${filter}`, {
    headers: { ...publicHeaders(), 'Prefer': 'count=exact', 'Range': '0-0' }
  });
  const range = res.headers.get('content-range');
  if (!range) return null;
  const total = parseInt(range.split('/')[1], 10);
  return Number.isFinite(total) ? total : null;
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  // Password gate
  const pw = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  if (!pw || pw !== ADMIN_PASSWORD) {
    return err(401, 'Unauthorized');
  }

  const params = event.queryStringParameters || {};
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
        const rows = await rest('/question_reports?select=*&order=created_at.desc.nullslast,id.desc&limit=500');
        return ok({ rows });
      }

      if (action === 'leaderboard') {
        const week = params.week || getWeekStart();
        const rows = await rest(`/leaderboard_entries?week_start=eq.${week}&select=*&order=score_pct.desc,time_seconds.asc,completed_at.asc&limit=500`);
        // Also list distinct weeks available
        const weeksRaw = await rest('/leaderboard_entries?select=week_start&order=week_start.desc&limit=1000');
        const weeks = [...new Set((weeksRaw || []).map(r => r.week_start))];
        return ok({ rows, weeks, week_start: week });
      }

      if (action === 'users') {
        const rows = await rest('/users?select=*&order=joined.desc.nullslast&limit=1000');
        return ok({ rows });
      }

      if (action === 'sessions') {
        const limit = Math.min(parseInt(params.limit || '100', 10), 500);
        const rows = await rest(`/sessions?select=*&order=created_at.desc.nullslast&limit=${limit}`);
        return ok({ rows });
      }

      return err(400, `Unknown GET action: ${action}`);
    }

    // ============ WRITE ==========
    if (event.httpMethod === 'POST') {
      return err(400, `Unknown POST action: ${action}`);
    }

    // ============ DELETE ACTIONS ============
    if (event.httpMethod === 'DELETE') {
      if (!adminHeaders()) {
        return err(503, 'SUPA_SERVICE_KEY not set on Netlify. Add it under Site → Site settings → Environment variables, then redeploy. Find the key in Supabase → Settings → API → "service_role" secret.');
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
      return err(400, `Unknown DELETE action: ${action}`);
    }

    return err(405, 'Method not allowed');
  } catch (e) {
    return err(500, e.message);
  }
};
