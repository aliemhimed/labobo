/* Netlify Function: admin dashboard data
   GET  /api/admin                                (Authorization: Bearer <token>)
     -> one snapshot of everything the Overview tab shows
   GET  /api/admin?view=users      -> every student with activity totals
   GET  /api/admin?user=<id>       -> one student's full insights
   POST /api/admin   body: { action: 'delete_report', id }
     -> removes a question report once it has been dealt with

   Only signed-in users whose confirmed email is listed in the ADMIN_EMAILS
   environment variable get in (see _lib/common#isAdmin); everyone else gets
   a 403 that reveals nothing. Reads use the service key, so no table needs
   an admin policy. */

const { SUPA_URL, dbHeaders, json, fail, parseBody, verifyUser, isAdmin, getWeekStart } = require('./_lib/common');

// Every question-bank table, grouped by app subject. Keep in sync with
// `sources` in src/lib/subjects.js.
const BANKS = [
  { subject: 'GCT I', semester: '1', tables: ['gct_biochemistry', 'gct_genetics', 'gct_molecular_biology', 'gct_histology'] },
  { subject: 'Medical Chemistry', semester: '1', tables: ['medical_chemistry'] },
  { subject: 'Medical Physics', semester: '1', tables: ['medical_physics'] },
  { subject: 'Clinical & Professional Skills', semester: '1', tables: ['clinical_skills'] },
  { subject: 'Body Systems', semester: '1', tables: ['bs_anatomy', 'bs_physiology', 'bs_imaging'] },
  { subject: 'Medicine & Art', semester: '1', tables: ['medicine_art'] },
  { subject: 'GCT II', semester: '2', tables: ['gct2_biochemistry', 'gct2_genetics', 'gct2_molecular_biology', 'gct2_histology'] },
  { subject: 'Body Systems II', semester: '2', tables: ['bs2_anatomy', 'bs2_physiology', 'bs2_imaging'] },
  { subject: 'Clinical & Professional Skills II', semester: '2', tables: ['clinical_skills_2'] },
  { subject: 'Medicine & Art II', semester: '2', tables: ['medicine_art_2'] },
];

const DAY = 86400000;
const SESSION_CAP = 5000;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

const rest = (path, init = {}) =>
  fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

async function rows(path) {
  const res = await rest(path);
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function count(table, filter = '') {
  const res = await rest(`/${table}?select=id${filter}`, { headers: { Prefer: 'count=exact', Range: '0-0' } });
  if (!res.ok) throw new Error(`count ${table} -> ${res.status}`);
  const n = parseInt((res.headers.get('content-range') || '').split('/')[1], 10);
  return Number.isFinite(n) ? n : 0;
}

/** Last `n` UTC days, oldest first, as [{ day, ...blank }]. */
function lastDays(n, blank) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push({ day: dayKey(Date.now() - i * DAY), ...blank });
  return out;
}

const tally = (list, keyOf) => {
  const m = new Map();
  for (const x of list) m.set(keyOf(x), (m.get(keyOf(x)) || 0) + 1);
  return [...m].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
};

const round1 = (n) => Math.round(n * 10) / 10;

async function snapshot() {
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const weekStart = getWeekStart();

  // Each section fails on its own so one broken table doesn't blank the page.
  const safe = async (fn) => {
    try { return { ok: true, data: await fn() }; } catch (e) { console.error('[admin]', e); return { ok: false, error: String(e.message || e) }; }
  };

  const t0 = Date.now();
  const [profiles, sessions, reports, board, banks, limits, visits, totals] = await Promise.all([
    safe(() => rows('/profiles?select=id,username,email,semester,created_at&order=created_at.desc&limit=5000')),
    safe(() => rows(`/sessions?select=device_id,subject,mode,score,total,pct,created_at&created_at=gte.${since30}&order=created_at.desc&limit=${SESSION_CAP}`)),
    safe(() => rows('/question_reports?select=id,question_id,question_text,subject,topic,reason,note,created_at&order=created_at.desc&limit=200')),
    safe(() => rows(`/leaderboard_entries?week_start=eq.${weekStart}&select=handle,subject,score_pct,total_questions,time_seconds,completed_at&order=score_pct.desc,time_seconds.asc&limit=500`)),
    safe(() => Promise.all(BANKS.map(async (b) => ({
      ...b,
      counts: await Promise.all(b.tables.map(async (t) => ({ table: t, n: await count(t) }))),
    })))),
    safe(async () => ({
      total: await count('rate_limit_hits'),
      last_hour: await count('rate_limit_hits', `&created_at=gte.${new Date(now - 3600000).toISOString()}`),
    })),
    safe(() => rows(`/daily_visits?select=user_id,day,hits&day=gte.${dayKey(now - 29 * DAY)}&limit=20000`)),
    safe(async () => ({
      sessions: await count('sessions'),
      leaderboard: await count('leaderboard_entries'),
      reports: await count('question_reports'),
      visitor_days: await count('daily_visits'),
    })),
  ]);
  const dbMs = Date.now() - t0;

  const out = { generated_at: new Date(now).toISOString(), week_start: weekStart, errors: {} };

  if (profiles.ok) {
    const list = profiles.data;
    const days = lastDays(30, { n: 0 });
    for (const p of list) {
      const d = days.find((x) => x.day === dayKey(p.created_at));
      if (d) d.n++;
    }
    out.users = {
      total: list.length,
      last_7d: list.filter((p) => now - new Date(p.created_at) < 7 * DAY).length,
      no_semester: list.filter((p) => !p.semester).length,
      by_semester: tally(list, (p) => p.semester || 'none'),
      signups_by_day: days,
      recent: list.slice(0, 15),
    };
  } else out.errors.users = profiles.error;

  if (sessions.ok) {
    const list = sessions.data;
    const days = lastDays(14, { n: 0, users: 0 });
    const perDayUsers = new Map(days.map((d) => [d.day, new Set()]));
    for (const s of list) {
      const k = dayKey(s.created_at);
      const d = days.find((x) => x.day === k);
      if (d) { d.n++; perDayUsers.get(k).add(s.device_id); }
    }
    days.forEach((d) => { d.users = perDayUsers.get(d.day).size; });

    const within = (ms) => list.filter((s) => now - new Date(s.created_at) < ms);
    const scored = list.filter((s) => s.pct !== null && s.pct !== undefined);
    const bySubject = new Map();
    for (const s of list) {
      const k = s.subject || 'Unknown';
      const cur = bySubject.get(k) || { subject: k, n: 0, sum: 0, scored: 0 };
      cur.n++;
      if (s.pct !== null && s.pct !== undefined) { cur.sum += Number(s.pct); cur.scored++; }
      bySubject.set(k, cur);
    }
    out.sessions = {
      last_24h: within(DAY).length,
      last_7d: within(7 * DAY).length,
      last_30d: list.length,
      capped: list.length >= SESSION_CAP,
      active_users_24h: new Set(within(DAY).map((s) => s.device_id)).size,
      active_users_7d: new Set(within(7 * DAY).map((s) => s.device_id)).size,
      avg_pct: scored.length ? round1(scored.reduce((a, s) => a + Number(s.pct), 0) / scored.length) : null,
      by_day: days,
      by_mode: tally(list, (s) => s.mode || 'unknown'),
      by_subject: [...bySubject.values()]
        .map((s) => ({ subject: s.subject, n: s.n, avg_pct: s.scored ? round1(s.sum / s.scored) : null }))
        .sort((a, b) => b.n - a.n),
      recent: list.slice(0, 15).map(({ device_id, ...s }) => s),
    };
  } else out.errors.sessions = sessions.error;

  if (reports.ok) {
    out.reports = {
      total: reports.data.length,
      last_7d: reports.data.filter((r) => now - new Date(r.created_at) < 7 * DAY).length,
      by_reason: tally(reports.data, (r) => r.reason),
      items: reports.data,
    };
  } else out.errors.reports = reports.error;

  if (board.ok) {
    const bySubject = new Map();
    for (const e of board.data) {
      const arr = bySubject.get(e.subject) || [];
      arr.push(e);
      bySubject.set(e.subject, arr);
    }
    out.leaderboard = {
      entries: board.data.length,
      boards: [...bySubject].map(([subject, list]) => ({ subject, entries: list.length, top: list.slice(0, 3) })),
    };
  } else out.errors.leaderboard = board.error;

  if (banks.ok) {
    out.banks = banks.data.map((b) => ({
      subject: b.subject,
      semester: b.semester,
      total: b.counts.reduce((a, c) => a + c.n, 0),
      tables: b.counts,
    }));
  } else out.errors.banks = banks.error;

  if (visits.ok) {
    const days = lastDays(30, { n: 0, hits: 0 });
    const perDay = new Map(days.map((d) => [d.day, d]));
    for (const v of visits.data) {
      const d = perDay.get(String(v.day).slice(0, 10));
      if (d) { d.n++; d.hits += v.hits; }
    }
    const recent = (n) => visits.data.filter((v) => String(v.day) >= dayKey(now - (n - 1) * DAY));
    out.visits = {
      today: days[days.length - 1].n,
      today_hits: days[days.length - 1].hits,
      unique_7d: new Set(recent(7).map((v) => v.user_id)).size,
      unique_30d: new Set(visits.data.map((v) => v.user_id)).size,
      hits_30d: visits.data.reduce((a, v) => a + v.hits, 0),
      by_day: days,
    };
  } else out.errors.visits = visits.error;

  const sem = (k) => out.users?.by_semester.find((s) => s.key === k)?.n ?? 0;
  out.counters = {
    students: out.users?.total ?? null,
    semester_1: sem('1'),
    semester_2: sem('2'),
    no_semester: out.users?.no_semester ?? null,
    signups_7d: out.users?.last_7d ?? null,
    visitors_today: out.visits?.today ?? null,
    visitors_7d: out.visits?.unique_7d ?? null,
    visits_today: out.visits?.today_hits ?? null,
    visits_30d: out.visits?.hits_30d ?? null,
    visitor_days_all: totals.ok ? totals.data.visitor_days : null,
    quizzes_all: totals.ok ? totals.data.sessions : null,
    quizzes_30d: out.sessions?.last_30d ?? null,
    quizzes_7d: out.sessions?.last_7d ?? null,
    quizzes_24h: out.sessions?.last_24h ?? null,
    questions_answered_30d: sessions.ok ? sessions.data.reduce((a, s) => a + (s.total || 0), 0) : null,
    reports_open: totals.ok ? totals.data.reports : null,
    reports_7d: out.reports?.last_7d ?? null,
    leaderboard_week: out.leaderboard?.entries ?? null,
    leaderboard_all: totals.ok ? totals.data.leaderboard : null,
    questions_in_banks: out.banks ? out.banks.reduce((a, b) => a + b.total, 0) : null,
    subjects_stocked: out.banks ? out.banks.filter((b) => b.total > 0).length : null,
    subjects_empty: out.banks ? out.banks.filter((b) => b.total === 0).length : null,
    rate_limit_hits_hour: limits.ok ? limits.data.last_hour : null,
  };

  out.system = {
    db_ms: dbMs,
    rate_limits: limits.ok ? limits.data : null,
    failing: Object.keys(out.errors),
  };
  return out;
}

/* ── Students ─────────────────────────────────────────────────────── */

const ALL_CAP = 20000;

/** Accounts from Supabase Auth (sign-in method, last sign-in), by id. */
async function authUsers() {
  const res = await fetch(`${SUPA_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: dbHeaders() });
  if (!res.ok) throw new Error(`auth users -> ${res.status}`);
  const body = await res.json();
  return new Map((body.users || []).map((u) => [u.id, {
    last_sign_in_at: u.last_sign_in_at || null,
    provider: u.app_metadata?.provider || null,
    confirmed: !!u.email_confirmed_at,
  }]));
}

async function usersView() {
  const [profiles, sessions, visits, auth] = await Promise.all([
    rows('/profiles?select=id,username,email,semester,created_at&order=created_at.desc&limit=5000'),
    rows(`/sessions?select=device_id,subject,score,total,pct,created_at&order=created_at.desc&limit=${ALL_CAP}`),
    rows(`/daily_visits?select=user_id,day,hits&limit=${ALL_CAP}`),
    authUsers().catch((e) => { console.error('[admin]', e); return new Map(); }),
  ]);

  const stats = new Map();
  for (const s of sessions) {
    const u = stats.get(s.device_id) || { quizzes: 0, questions: 0, sum: 0, scored: 0, best: null, last: null, subjects: new Map() };
    u.quizzes++;
    u.questions += s.total || 0;
    if (s.pct !== null && s.pct !== undefined) {
      u.sum += Number(s.pct); u.scored++;
      u.best = u.best === null ? Number(s.pct) : Math.max(u.best, Number(s.pct));
    }
    if (!u.last) u.last = s.created_at; // rows are newest first
    const subject = s.subject || 'Unknown';
    u.subjects.set(subject, (u.subjects.get(subject) || 0) + 1);
    stats.set(s.device_id, u);
  }
  const vis = new Map();
  for (const v of visits) {
    const u = vis.get(v.user_id) || { days: 0, hits: 0, last: null };
    u.days++; u.hits += v.hits;
    if (!u.last || v.day > u.last) u.last = v.day;
    vis.set(v.user_id, u);
  }

  const users = profiles.map((p) => {
    const st = stats.get(p.id);
    const v = vis.get(p.id);
    const a = auth.get(p.id);
    const top = st ? [...st.subjects].sort((x, y) => y[1] - x[1])[0] : null;
    return {
      ...p,
      provider: a?.provider ?? null,
      last_sign_in_at: a?.last_sign_in_at ?? null,
      quizzes: st?.quizzes ?? 0,
      questions: st?.questions ?? 0,
      avg_pct: st?.scored ? round1(st.sum / st.scored) : null,
      best_pct: st?.best ?? null,
      last_quiz_at: st?.last ?? null,
      top_subject: top ? top[0] : null,
      visit_days: v?.days ?? 0,
      visits: v?.hits ?? 0,
      last_visit_day: v?.last ?? null,
    };
  });
  return { users, capped: sessions.length >= ALL_CAP };
}

async function userDetail(id) {
  const q = encodeURIComponent(id);
  const now = Date.now();
  const [profile, sessions, visits, board, reports, auth] = await Promise.all([
    rows(`/profiles?id=eq.${q}&select=id,username,email,semester,created_at`),
    rows(`/sessions?device_id=eq.${q}&select=subject,mode,score,total,pct,created_at&order=created_at.desc&limit=2000`),
    rows(`/daily_visits?user_id=eq.${q}&select=day,hits&order=day.desc&limit=400`),
    rows(`/leaderboard_entries?device_id=eq.${q}&select=handle,subject,score_pct,time_seconds,week_start,completed_at&order=week_start.desc&limit=100`),
    rows(`/question_reports?device_id=eq.${q}&select=id,reason,subject,note,created_at&order=created_at.desc&limit=100`),
    authUsers().catch(() => new Map()),
  ]);
  if (!profile[0]) return null;

  const scored = sessions.filter((s) => s.pct !== null && s.pct !== undefined);
  const groups = (keyOf) => {
    const m = new Map();
    for (const s of sessions) {
      const k = keyOf(s);
      const c = m.get(k) || { key: k, n: 0, sum: 0, scored: 0, best: null, last: null };
      c.n++;
      if (s.pct !== null && s.pct !== undefined) {
        c.sum += Number(s.pct); c.scored++;
        c.best = c.best === null ? Number(s.pct) : Math.max(c.best, Number(s.pct));
      }
      if (!c.last) c.last = s.created_at;
      m.set(k, c);
    }
    return [...m.values()]
      .map((c) => ({ key: c.key, n: c.n, avg_pct: c.scored ? round1(c.sum / c.scored) : null, best_pct: c.best, last: c.last }))
      .sort((a, b) => b.n - a.n);
  };

  const days = lastDays(30, { n: 0 });
  for (const s of sessions) {
    const d = days.find((x) => x.day === dayKey(s.created_at));
    if (d) d.n++;
  }
  const visitDays = lastDays(30, { n: 0 });
  for (const v of visits) {
    const d = visitDays.find((x) => x.day === String(v.day).slice(0, 10));
    if (d) d.n = v.hits;
  }

  // Current streak: consecutive UTC days, ending today or yesterday, with a
  // quiz or a visit.
  const active = new Set([...sessions.map((s) => dayKey(s.created_at)), ...visits.map((v) => String(v.day).slice(0, 10))]);
  let streak = 0;
  let cursor = active.has(dayKey(now)) ? now : now - DAY;
  while (active.has(dayKey(cursor))) { streak++; cursor -= DAY; }

  const a = auth.get(id);
  return {
    profile: { ...profile[0], provider: a?.provider ?? null, last_sign_in_at: a?.last_sign_in_at ?? null, confirmed: a?.confirmed ?? null },
    totals: {
      quizzes: sessions.length,
      questions: sessions.reduce((n, s) => n + (s.total || 0), 0),
      avg_pct: scored.length ? round1(scored.reduce((n, s) => n + Number(s.pct), 0) / scored.length) : null,
      best_pct: scored.length ? Math.max(...scored.map((s) => Number(s.pct))) : null,
      last_quiz_at: sessions[0]?.created_at ?? null,
      first_quiz_at: sessions.length ? sessions[sessions.length - 1].created_at : null,
      active_days: active.size,
      visit_days: visits.length,
      visits: visits.reduce((n, v) => n + v.hits, 0),
      streak,
      reports: reports.length,
      leaderboard_entries: board.length,
    },
    by_subject: groups((s) => s.subject || 'Unknown'),
    by_mode: groups((s) => s.mode || 'unknown'),
    activity_by_day: days,
    visits_by_day: visitDays,
    // Oldest first, so it reads left to right as a trend.
    trend: scored.slice(0, 30).reverse().map((s) => ({ pct: Number(s.pct), at: s.created_at, subject: s.subject })),
    recent: sessions.slice(0, 20),
    leaderboard: board,
    reports,
  };
}

exports.handler = async (event) => {
  // Same-origin only: no CORS headers, preflights get an empty 204.
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');
  if (!isAdmin(caller)) return fail(403, 'Not allowed');

  try {
    if (event.httpMethod === 'GET') {
      dbHeaders(); // throws with the real reason if SUPA_SERVICE_KEY is missing
      const { view, user } = event.queryStringParameters || {};
      if (view === 'users') return json(200, await usersView());
      if (user) {
        if (!/^[0-9a-f-]{36}$/i.test(user)) return fail(400, 'Invalid user id');
        const detail = await userDetail(user);
        return detail ? json(200, detail) : fail(404, 'No such student');
      }
      return json(200, await snapshot());
    }

    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      if (!body) return fail(400, 'Body must be a JSON object');
      if (body.action === 'delete_report') {
        const id = Number(body.id);
        if (!Number.isInteger(id) || id <= 0) return fail(400, 'Invalid id');
        const res = await rest(`/question_reports?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
        if (!res.ok) return fail(502, 'Could not delete', `${res.status} ${await res.text()}`);
        return json(200, { ok: true });
      }
      return fail(400, 'Unknown action');
    }

    return fail(405, 'Method not allowed');
  } catch (e) {
    return fail(500, 'Admin data is unavailable right now', e);
  }
};
