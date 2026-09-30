/* Netlify Function: admin dashboard data
   GET  /api/admin                                (Authorization: Bearer <token>)
     -> one snapshot of everything the Overview tab shows
   GET  /api/admin?view=me         -> { admin: true|false } for any signed-in
                                      user (drives the profile-menu link)
   GET  /api/admin?view=users      -> every student with activity totals
   GET  /api/admin?view=users_csv  -> the same, as a CSV download (logged)
   GET  /api/admin?user=<id>       -> one student's full insights
   GET  /api/admin?view=questions  -> open reports grouped by question, each
                                      with the question itself and how often
                                      each option is picked; the questions
                                      most students get wrong
   GET  /api/admin?view=announcements -> banners, newest first
   GET  /api/admin?view=log        -> what admins did, newest first
   POST /api/admin   body: { action: 'resolve_reports', ids: [..] }
   POST /api/admin   body: { action: 'reopen_reports', ids: [..] }
     -> marks question reports dealt with (or not) — kept, not deleted
   POST /api/admin   body: { action: 'delete_user', id }
     -> permanently deletes a student's account and all their data
   POST /api/admin   body: { action: 'create_announcement', message, tone, semester, ends_at }
   POST /api/admin   body: { action: 'end_announcement', id }

   Every GET takes `tz` (the admin's IANA time zone, e.g. Africa/Tripoli):
   days in charts, "today" and streaks follow it. Missing or unknown -> UTC.

   The counting happens in the database (admin_overview, admin_users,
   admin_user_stats — see supabase/migrations), so totals aren't capped by
   how many rows a function can download. Every change an admin makes is
   written to admin_log.

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
  { subject: 'Scientific Reasoning', semester: '1 & 2', tables: ['scientific_reasoning'] },
];

const BANK_TABLES = new Set(BANKS.flatMap((b) => b.tables));
const TABLE_SUBJECT = new Map(BANKS.flatMap((b) => b.tables.map((t) => [t, b.subject])));

const UUID = /^[0-9a-f-]{36}$/i;

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

/** Exact row count; `filter` is extra query string, e.g. '&resolved_at=is.null'. */
async function count(table, filter = '') {
  const res = await rest(`/${table}?select=*${filter}`, { headers: { Prefer: 'count=exact', Range: '0-0' } });
  if (!res.ok) throw new Error(`count ${table} -> ${res.status}`);
  const n = parseInt((res.headers.get('content-range') || '').split('/')[1], 10);
  return Number.isFinite(n) ? n : 0;
}

async function rpc(fn, args) {
  const res = await rest(`/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
  if (!res.ok) throw new Error(`${fn} -> ${res.status} ${await res.text()}`);
  return res.json();
}

/* An IANA zone name both Node and Postgres understand, or UTC. Postgres
   rejects a zone it doesn't know, so a call that fails on the zone is
   retried in UTC rather than blanking the dashboard. */
function zone(tz) {
  if (typeof tz !== 'string' || !/^[A-Za-z]+(?:[/_+-][A-Za-z0-9]+)*$/.test(tz) || tz.length > 64) return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}
async function rpcInZone(fn, args) {
  try {
    return await rpc(fn, args);
  } catch (e) {
    if (args.p_tz !== 'UTC' && /time zone/i.test(String(e.message))) return rpc(fn, { ...args, p_tz: 'UTC' });
    throw e;
  }
}

const tally = (list, keyOf) => {
  const m = new Map();
  for (const x of list) m.set(keyOf(x), (m.get(keyOf(x)) || 0) + 1);
  return [...m].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
};

const round1 = (n) => Math.round(n * 10) / 10;

/* Record something an admin did. Never fails the action itself. */
async function logAction(caller, action, target, details = {}) {
  try {
    const res = await rest('/admin_log', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ admin_email: caller.email, action, target: target == null ? null : String(target), details }),
    });
    if (!res.ok) console.error('[admin] log', res.status, await res.text());
  } catch (e) {
    console.error('[admin] log', e);
  }
}

/* ── Overview ─────────────────────────────────────────────────────── */

async function snapshot(tz) {
  const weekStart = getWeekStart();

  // Each section fails on its own so one broken table doesn't blank the page.
  const safe = async (fn) => {
    try { return { ok: true, data: await fn() }; } catch (e) { console.error('[admin]', e); return { ok: false, error: String(e.message || e) }; }
  };

  const t0 = Date.now();
  const [overview, recentUsers, recentSessions, reports, openReports, board, banks, limits, extras] = await Promise.all([
    safe(() => rpcInZone('admin_overview', { p_tz: tz })),
    safe(() => rows('/profiles?select=id,username,email,semester,created_at&order=created_at.desc&limit=15')),
    safe(() => rows('/sessions?select=subject,mode,score,total,pct,created_at&order=created_at.desc&limit=15')),
    safe(() => rows('/question_reports?resolved_at=is.null&select=reason,created_at&order=created_at.desc&limit=1000')),
    safe(() => count('question_reports', '&resolved_at=is.null')),
    safe(() => rows(`/leaderboard_entries?week_start=eq.${weekStart}&select=handle,subject,score_pct,total_questions,time_seconds,completed_at&order=score_pct.desc,time_seconds.asc&limit=500`)),
    safe(() => Promise.all(BANKS.map(async (b) => ({
      ...b,
      counts: await Promise.all(b.tables.map(async (t) => ({ table: t, n: await count(t) }))),
    })))),
    safe(async () => ({
      total: await count('rate_limit_hits'),
      last_hour: await count('rate_limit_hits', `&created_at=gte.${new Date(Date.now() - 3600000).toISOString()}`),
    })),
    safe(async () => ({ leaderboard: await count('leaderboard_entries') })),
  ]);
  const dbMs = Date.now() - t0;

  const out = { generated_at: new Date().toISOString(), week_start: weekStart, tz, errors: {} };

  if (overview.ok) {
    const o = overview.data;
    out.today = o.today;
    out.users = { ...o.students, recent: recentUsers.ok ? recentUsers.data : [] };
    out.sessions = { ...o.sessions, recent: recentSessions.ok ? recentSessions.data : [] };
    out.visits = o.visits;
    out.retention = o.retention;
  } else {
    for (const k of ['users', 'sessions', 'visits', 'retention']) out.errors[k] = overview.error;
  }

  if (reports.ok) {
    const now = Date.now();
    out.reports = {
      open: openReports.ok ? openReports.data : reports.data.length,
      last_7d: reports.data.filter((r) => now - new Date(r.created_at) < 7 * 86400000).length,
      by_reason: tally(reports.data, (r) => r.reason),
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
    visitor_days_all: out.visits?.all_time ?? null,
    quizzes_all: out.sessions?.all_time ?? null,
    quizzes_30d: out.sessions?.last_30d ?? null,
    quizzes_7d: out.sessions?.last_7d ?? null,
    quizzes_24h: out.sessions?.last_24h ?? null,
    questions_answered_30d: out.sessions?.questions_answered ?? null,
    active_7d: out.retention?.active_7d ?? null,
    returning_7d: out.retention?.returning_7d ?? null,
    new_7d: out.retention?.new_7d ?? null,
    quiet: out.retention?.quiet_count ?? null,
    lapsed: out.retention?.lapsed_count ?? null,
    reports_open: out.reports?.open ?? null,
    reports_7d: out.reports?.last_7d ?? null,
    leaderboard_week: out.leaderboard?.entries ?? null,
    leaderboard_all: extras.ok ? extras.data.leaderboard : null,
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

/* ── Questions: reports and answer stats ──────────────────────────── */

const MIN_ATTEMPTS = 5; // fewer answers than this says nothing yet
const LIST_MAX = 25;
const ID_CHUNK = 150;   // ids per `id=in.(…)` request, keeps URLs short

/** Bank rows for "<table>:<id>" question ids, as Map(id -> { table,
    subject, row }). Unknown tables are skipped; a question deleted from its
    bank is simply absent. */
async function bankRows(ids, cols) {
  const byTable = new Map();
  for (const id of new Set(ids)) {
    const [table, rowId] = String(id).split(':');
    if (!BANK_TABLES.has(table) || !/^\d+$/.test(rowId || '')) continue;
    if (!byTable.has(table)) byTable.set(table, []);
    byTable.get(table).push(rowId);
  }
  const out = new Map();
  await Promise.all([...byTable].flatMap(([table, list]) => {
    const chunks = [];
    for (let i = 0; i < list.length; i += ID_CHUNK) chunks.push(list.slice(i, i + ID_CHUNK));
    return chunks.map(async (chunk) => {
      for (const row of await rows(`/${table}?id=in.(${chunk.join(',')})&select=${cols}`)) {
        out.set(`${table}:${row.id}`, { table, subject: TABLE_SUBJECT.get(table), row });
      }
    });
  }));
  return out;
}

/* Correct share and the most-picked wrong option, scored against the
   current answer key. */
function scoreStats(s, answer) {
  const picks = s.picks || {};
  const correct = Number(picks[String(answer)] || 0);
  let top = null;
  for (const [k, n] of Object.entries(picks)) {
    if (k === 'blank' || k === String(answer)) continue;
    if (!top || Number(n) > top.n) top = { option: Number(k), n: Number(n) };
  }
  return {
    attempts: s.attempts,
    correct,
    picks,
    correct_pct: s.attempts ? round1((100 * correct) / s.attempts) : null,
    top_wrong: top ? { ...top, pct: round1((100 * top.n) / s.attempts) } : null,
    // More students chose one particular wrong option than the keyed one:
    // often a sign the key itself is wrong.
    suspect: !!top && s.attempts >= MIN_ATTEMPTS && top.n > correct,
  };
}

async function questionsView() {
  const safe = async (fn) => {
    try { return { ok: true, data: await fn() }; } catch (e) { console.error('[admin]', e); return { ok: false, error: String(e.message || e) }; }
  };
  const [open, resolved, stats, tracked] = await Promise.all([
    safe(() => rows('/question_reports?resolved_at=is.null&select=id,question_id,question_text,subject,topic,reason,note,created_at,device_id&order=created_at.desc&limit=500')),
    safe(() => rows('/question_reports?resolved_at=not.is.null&select=id,question_id,question_text,subject,reason,resolved_at,resolved_by&order=resolved_at.desc&limit=40')),
    safe(() => rows(`/question_stats?attempts=gte.${MIN_ATTEMPTS}&select=question_id,attempts,picks&order=attempts.desc&limit=2000`)),
    safe(() => count('question_stats')),
  ]);
  const errors = {};

  // 1. Score every well-answered question against its current key.
  let scored = [];
  if (stats.ok) {
    try {
      const keys = await bankRows(stats.data.map((s) => s.question_id), 'id,answer');
      scored = stats.data
        .filter((s) => keys.has(s.question_id))
        .map((s) => ({ question_id: s.question_id, ...scoreStats(s, keys.get(s.question_id).row.answer) }));
    } catch (e) { errors.stats = String(e.message || e); }
  } else errors.stats = stats.error;
  const statsById = new Map(scored.map((s) => [s.question_id, s]));

  // Suspects: biggest lead of a wrong option over the keyed one first.
  const lead = (s) => s.top_wrong.n - s.correct;
  const suspects = scored.filter((s) => s.suspect)
    .sort((a, b) => lead(b) - lead(a) || a.correct_pct - b.correct_pct)
    .slice(0, LIST_MAX);
  const hardest = scored.filter((s) => !s.suspect)
    .sort((a, b) => a.correct_pct - b.correct_pct || b.attempts - a.attempts)
    .slice(0, LIST_MAX);

  // 2. Open reports, one group per question (old reports without an id are
  //    grouped by their text).
  const groups = new Map();
  if (open.ok) {
    for (const r of open.data) {
      const key = r.question_id || `text:${r.question_text}`;
      const g = groups.get(key) || { key, question_id: r.question_id, question_text: r.question_text, subject: r.subject, topic: r.topic, reports: [], last_at: r.created_at };
      g.reports.push({ id: r.id, reason: r.reason, note: r.note, created_at: r.created_at, user_id: r.device_id });
      groups.set(key, g);
    }
  } else errors.reports = open.error;

  // 3. The full question for everything about to be shown.
  const wanted = [...suspects, ...hardest].map((s) => s.question_id)
    .concat([...groups.values()].map((g) => g.question_id).filter(Boolean));
  let full = new Map();
  try {
    full = await bankRows(wanted, 'id,topic,q,options,answer,explanation,image,images');
  } catch (e) { errors.questions = String(e.message || e); }
  const question = (id) => {
    const hit = id && full.get(id);
    return hit ? { id, table: hit.table, subject: hit.subject, row: hit.row } : null;
  };
  const withQuestion = (s) => ({ ...s, question: question(s.question_id) });

  const reportGroups = [...groups.values()]
    .map((g) => ({
      ...g,
      question: question(g.question_id),
      stats: statsById.get(g.question_id) || null,
      reasons: tally(g.reports, (r) => r.reason),
    }))
    // Most-reported first, then most recent.
    .sort((a, b) => b.reports.length - a.reports.length || String(b.last_at).localeCompare(String(a.last_at)));

  if (!resolved.ok) errors.resolved = resolved.error;
  return {
    min_attempts: MIN_ATTEMPTS,
    reports: open.ok ? { open: open.data.length, groups: reportGroups } : null,
    resolved: resolved.ok ? resolved.data : null,
    stats: {
      tracked: tracked.ok ? tracked.data : null,
      scored: scored.length,
      suspect_count: scored.filter((s) => s.suspect).length,
      suspects: suspects.map(withQuestion),
      hardest: hardest.map(withQuestion),
    },
    errors,
  };
}

async function setReportsResolved(ids, caller, resolved) {
  const list = Array.isArray(ids) ? ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  if (!list.length || list.length > 500) return fail(400, 'Invalid ids');
  const res = await rest(`/question_reports?id=in.(${list.join(',')})&select=id,question_id,question_text`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(resolved
      ? { resolved_at: new Date().toISOString(), resolved_by: caller.email }
      : { resolved_at: null, resolved_by: null }),
  });
  if (!res.ok) return fail(502, 'Could not update the reports', `${res.status} ${await res.text()}`);
  const changed = (await res.json().catch(() => null)) || [];
  if (changed.length) {
    await logAction(caller, resolved ? 'resolve_reports' : 'reopen_reports', changed[0].question_id || null, {
      ids: changed.map((r) => r.id),
      question: String(changed[0].question_text || '').slice(0, 200),
    });
  }
  return json(200, { ok: true });
}

/* ── Students ─────────────────────────────────────────────────────── */

const usersView = async () => ({ users: await rpc('admin_users', {}) });

/* Spreadsheet-safe CSV: quoted where needed, and a cell that starts like a
   formula (= + - @) is prefixed so Excel won't run it. */
function csv(table) {
  const cell = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return table.map((row) => row.map(cell).join(',')).join('\r\n');
}

async function usersCsv(caller) {
  const users = await rpc('admin_users', {});
  const head = ['Name', 'Email', 'Semester', 'Sign-in', 'Email confirmed', 'Joined', 'Last sign-in', 'Quizzes', 'Questions answered',
    'Average %', 'Best %', 'Last quiz', 'Top subject', 'Visit days', 'Visits', 'Last visit'];
  const body = users.map((u) => [u.username, u.email, u.semester, u.provider, u.confirmed ? 'yes' : 'no', u.created_at, u.last_sign_in_at,
    u.quizzes, u.questions, u.avg_pct, u.best_pct, u.last_quiz_at, u.top_subject, u.visit_days, u.visits, u.last_visit_day]);
  await logAction(caller, 'export_students', null, { rows: users.length });
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="labobo-students-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
    // BOM so Excel reads the file as UTF-8 (Arabic names, accents).
    body: '﻿' + csv([head, ...body]),
  };
}

async function userDetail(id, tz) {
  const q = encodeURIComponent(id);
  const [profile, stats, board, reports, auth] = await Promise.all([
    rows(`/profiles?id=eq.${q}&select=id,username,email,semester,created_at`),
    rpcInZone('admin_user_stats', { p_user: id, p_tz: tz }),
    rows(`/leaderboard_entries?device_id=eq.${q}&select=handle,subject,score_pct,time_seconds,week_start,completed_at&order=week_start.desc&limit=100`),
    rows(`/question_reports?device_id=eq.${q}&select=id,reason,subject,note,created_at,resolved_at&order=created_at.desc&limit=100`),
    fetch(`${SUPA_URL}/auth/v1/admin/users/${q}`, { headers: dbHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);
  if (!profile[0]) return null;

  return {
    profile: {
      ...profile[0],
      is_admin: isAdmin({ email: profile[0].email, emailConfirmed: true }),
      provider: auth?.app_metadata?.provider ?? null,
      last_sign_in_at: auth?.last_sign_in_at ?? null,
      confirmed: auth ? !!auth.email_confirmed_at : null,
    },
    totals: { ...stats.totals, reports: reports.length, leaderboard_entries: board.length },
    by_subject: stats.by_subject,
    by_mode: stats.by_mode,
    activity_by_day: stats.activity_by_day,
    visits_by_day: stats.visits_by_day,
    trend: stats.trend,
    recent: stats.recent,
    leaderboard: board,
    reports,
  };
}

/* Permanently removes a student: the Supabase Auth account first (profiles
   cascades from it), then their rows in the tables keyed by user id, which
   have no foreign key. Admins can't be deleted here, so nobody can lock the
   dashboard by removing themselves or a co-admin. The log keeps who it was. */
async function deleteUser(id, caller) {
  if (!UUID.test(id || '')) return fail(400, 'Invalid user id');
  if (id === caller.id) return fail(400, "You can't delete your own account");

  const [profile] = await rows(`/profiles?id=eq.${encodeURIComponent(id)}&select=username,email,semester,created_at`);
  if (profile && isAdmin({ email: profile.email, emailConfirmed: true })) {
    return fail(400, "Admin accounts can't be deleted here");
  }
  const quizzes = await count('sessions', `&device_id=eq.${encodeURIComponent(id)}`).catch(() => null);

  const res = await fetch(`${SUPA_URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: dbHeaders() });
  if (!res.ok && res.status !== 404) return fail(502, 'Could not delete the account', `auth delete ${res.status} ${await res.text()}`);

  const failed = [];
  for (const [table, column] of [
    ['sessions', 'device_id'], ['leaderboard_entries', 'device_id'], ['question_reports', 'device_id'],
    ['daily_visits', 'user_id'], ['rate_limit_hits', 'user_id'], ['user_progress', 'user_id'], ['profiles', 'id'],
  ]) {
    const r = await rest(`/${table}?${column}=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    if (!r.ok) { failed.push(table); console.error('[admin] cleanup', table, r.status, await r.text()); }
  }
  await logAction(caller, 'delete_user', id, {
    username: profile?.username ?? null, email: profile?.email ?? null, semester: profile?.semester ?? null,
    joined: profile?.created_at ?? null, quizzes, cleanup_failed: failed,
  });
  return json(200, { ok: true, cleanup_failed: failed });
}

/* ── Announcements ────────────────────────────────────────────────── */

const TONES = new Set(['info', 'warning', 'success']);

async function announcementsView() {
  const list = await rows('/announcements?select=id,message,tone,semester,starts_at,ends_at,created_at,created_by&order=created_at.desc&limit=50');
  const now = Date.now();
  return {
    items: list.map((a) => ({
      ...a,
      live: new Date(a.starts_at) <= now && (!a.ends_at || new Date(a.ends_at) > now),
    })),
  };
}

async function createAnnouncement(body, caller) {
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 500) return fail(400, 'The message must be 1-500 characters');
  const tone = TONES.has(body.tone) ? body.tone : 'info';
  const semester = body.semester === '1' || body.semester === '2' ? body.semester : null;
  let endsAt = null;
  if (body.ends_at) {
    const d = new Date(body.ends_at);
    if (isNaN(d) || d <= new Date()) return fail(400, 'The end date must be in the future');
    endsAt = d.toISOString();
  }
  const res = await rest('/announcements', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ message, tone, semester, ends_at: endsAt, created_by: caller.email }),
  });
  if (!res.ok) return fail(502, 'Could not post the announcement', `${res.status} ${await res.text()}`);
  const [row] = await res.json();
  await logAction(caller, 'create_announcement', row?.id, { message, tone, semester, ends_at: endsAt });
  return json(200, { ok: true, item: row });
}

async function endAnnouncement(id, caller) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return fail(400, 'Invalid id');
  const now = new Date().toISOString();
  const res = await rest(`/announcements?id=eq.${n}&or=(ends_at.is.null,ends_at.gt.${now})`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ends_at: now }),
  });
  if (!res.ok) return fail(502, 'Could not end the announcement', `${res.status} ${await res.text()}`);
  const [row] = await res.json();
  if (row) await logAction(caller, 'end_announcement', n, { message: row.message });
  return json(200, { ok: true });
}

/* ── Log ──────────────────────────────────────────────────────────── */

const logView = async () => ({
  items: await rows('/admin_log?select=id,at,admin_email,action,target,details&order=at.desc&limit=200'),
});

/* ── Handler ──────────────────────────────────────────────────────── */

exports.handler = async (event) => {
  // Same-origin only: no CORS headers, preflights get an empty 204.
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  // Answers any signed-in user, so the app can decide whether to show the link.
  if (event.httpMethod === 'GET' && event.queryStringParameters?.view === 'me') {
    return json(200, { admin: isAdmin(caller) });
  }

  if (!isAdmin(caller)) return fail(403, 'Not allowed');

  try {
    if (event.httpMethod === 'GET') {
      dbHeaders(); // throws with the real reason if SUPA_SERVICE_KEY is missing
      const { view, user, tz: rawTz } = event.queryStringParameters || {};
      const tz = zone(rawTz);
      if (view === 'users') return json(200, await usersView());
      if (view === 'users_csv') return await usersCsv(caller);
      if (view === 'questions') return json(200, await questionsView());
      if (view === 'announcements') return json(200, await announcementsView());
      if (view === 'log') return json(200, await logView());
      if (user) {
        if (!UUID.test(user)) return fail(400, 'Invalid user id');
        const detail = await userDetail(user, tz);
        return detail ? json(200, detail) : fail(404, 'No such student');
      }
      return json(200, await snapshot(tz));
    }

    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      if (!body) return fail(400, 'Body must be a JSON object');
      switch (body.action) {
        case 'resolve_reports': return await setReportsResolved(body.ids, caller, true);
        case 'reopen_reports': return await setReportsResolved(body.ids, caller, false);
        case 'delete_user': return await deleteUser(body.id, caller);
        case 'create_announcement': return await createAnnouncement(body, caller);
        case 'end_announcement': return await endAnnouncement(body.id, caller);
        default: return fail(400, 'Unknown action');
      }
    }

    return fail(405, 'Method not allowed');
  } catch (e) {
    return fail(500, 'Admin data is unavailable right now', e);
  }
};
