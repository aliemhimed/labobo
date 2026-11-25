/* Netlify Function: the free plan's daily set from the locked lectures.

   A student without a pass or trial reads the free lectures as much as they
   like. From the locked lectures they get, per subject and per day, one
   practice set and one exam of up to 30 questions. The day is Tbilisi's
   (UTC+4, no daylight saving), so it rolls over at midnight there.

   GET  /api/daily?subject=gct               (Authorization: Bearer <token>)
     -> { day, resets_at, sets: { practice: Set | null, exam: Set | null } }
        Set: { scope, ids: ["<table>:<id>", ...], rows: { <table>: [row, ...] } }
        Today's sets with their questions, so a refresh in the middle of one
        finds the questions again. Empty for students who read everything.

   POST /api/daily   body: { subject, mode: 'practice' | 'exam', scope,
                             topics: [{ table, topic }], plan: { <table>: n } }
     -> Set, the one just drawn
        `topics` are the locked lectures the set may draw from (raw names, as
        /api/questions lists them), `plan` how many questions each table
        gives (the app splits the 30 by the subject's ratio). The server
        draws the questions itself, never more than 30, and keeps them, so a
        second request the same day gets 409 rather than a fresh set.

   Only the service key reaches daily_sets (no grants for the public key). */

const { SUPA_URL, dbHeaders, json, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');
const { isLocked, getAccess, hasFullAccess } = require('./_lib/access');

const SET_SIZE = 30;
const MODES = ['practice', 'exam'];
const SCOPES = ['all', 'before', 'after', 'custom'];
const TZ_OFFSET_MS = 4 * 3600_000; // Tbilisi, UTC+4 all year

// Which tables each subject page draws from. Keep in sync with SUBJECTS in
// src/lib/subjects.js (the keys are each subject's `path`).
const SUBJECT_TABLES = {
  gct: ['gct_biochemistry', 'gct_genetics', 'gct_molecular_biology', 'gct_histology'],
  'body-systems': ['bs_anatomy', 'bs_physiology', 'bs_imaging'],
  chemistry: ['medical_chemistry'],
  physics: ['medical_physics'],
  clinical: ['clinical_skills'],
  'medicine-art': ['medicine_art'],
  'gct-2': ['gct2_biochemistry', 'gct2_genetics', 'gct2_molecular_biology', 'gct2_histology'],
  'body-systems-2': ['bs2_anatomy', 'bs2_physiology', 'bs2_imaging'],
  'clinical-2': ['clinical_skills_2'],
  'scientific-reasoning': ['scientific_reasoning'],
  'gct-3': ['gct3_biochemistry', 'gct3_immunology', 'gct3_biophysics'],
  'gct-4': ['gct4_immunology', 'gct4_microbiology'],
  'body-systems-4': ['bs4_anatomy', 'bs4_physiology', 'bs4_imaging'],
  'history-of-medicine': ['history_of_medicine'],
};

const BASE_COLS = 'id,ord,topic,q,options,answer,explanation,image,images,option_notes';
const TABLES_WITH_DISPLAY_TOPIC = ['clinical_skills', 'clinical_skills_2'];
const selectFor = (t) => (TABLES_WITH_DISPLAY_TOPIC.includes(t) ? `${BASE_COLS},display_topic` : BASE_COLS);
const topicOf = (row) => row.display_topic || row.topic || '';

/** Today in Tbilisi as YYYY-MM-DD, and the moment it ends (ISO, UTC). */
function today(now = Date.now()) {
  const local = new Date(now + TZ_OFFSET_MS);
  const day = local.toISOString().slice(0, 10);
  const resets = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000 - TZ_OFFSET_MS).toISOString();
  return { day, resets_at: resets };
}

async function db(path, init = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`daily ${path.split('?')[0]}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/** Every row of `table` (they are a few hundred to a thousand at most). */
async function allRows(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const batch = await db(`/${table}?select=${selectFor(table)}&order=ord.asc,id.asc`, {
      headers: { Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    });
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
}

/** { table: [row, ...] } for stored "<table>:<id>" ids, in the stored order. */
async function rowsFor(ids) {
  const byTable = {};
  for (const qid of ids) {
    const [table, id] = qid.split(':');
    (byTable[table] ||= []).push(id);
  }
  const out = {};
  await Promise.all(Object.entries(byTable).map(async ([table, list]) => {
    out[table] = await db(`/${table}?id=in.(${list.join(',')})&select=${selectFor(table)}`);
  }));
  return out;
}

const shape = (row) => ({ scope: row.scope, ids: row.question_ids });

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function freeTopics(tables) {
  const rows = await db(`/free_topics?tb=in.(${tables.join(',')})&select=tb,topic`);
  const free = new Set();
  for (const r of rows) free.add(`${r.tb}::${r.topic}`);
  return free;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  const body = event.httpMethod === 'POST' ? parseBody(event) : null;
  const subject = event.httpMethod === 'GET' ? (event.queryStringParameters || {}).subject : body?.subject;
  const tables = SUBJECT_TABLES[subject];
  if (!tables) return fail(400, 'Unknown subject');

  const { day, resets_at } = today();
  try {
    // Before the lock, or with a pass or trial, the whole bank is open and
    // there is nothing to ration.
    const limited = isLocked() && !hasFullAccess(await getAccess(caller, event));

    if (event.httpMethod === 'GET') {
      const sets = { practice: null, exam: null };
      if (limited) {
        const rows = await db(`/daily_sets?user_id=eq.${caller.id}&subject=eq.${encodeURIComponent(subject)}&day=eq.${day}&select=mode,scope,question_ids`);
        await Promise.all(rows.map(async (r) => {
          sets[r.mode] = { ...shape(r), rows: await rowsFor(r.question_ids) };
        }));
      }
      return json(200, { day, resets_at, limited, sets }, { 'Cache-Control': 'private, no-store' });
    }

    // POST: draw today's set.
    if (!limited) return fail(409, 'You already have every lecture open');
    const mode = body.mode;
    const scope = body.scope;
    if (!MODES.includes(mode)) return fail(400, 'mode must be practice or exam');
    if (!SCOPES.includes(scope)) return fail(400, 'Unknown scope');
    if (!Array.isArray(body.topics) || !body.topics.length || body.topics.length > 200) return fail(400, 'topics must be a list');
    if (!body.plan || typeof body.plan !== 'object') return fail(400, 'plan is missing');
    if (!(await allowRequest(caller.id, 'daily_set', 20, 3600))) return fail(429, 'Too many requests');

    const existing = await db(`/daily_sets?user_id=eq.${caller.id}&subject=eq.${encodeURIComponent(subject)}&mode=eq.${mode}&day=eq.${day}&select=scope`);
    if (existing.length) return fail(409, `You have already used today's free ${mode}`);

    // Only locked lectures of this subject: the free ones are open anyway.
    const free = await freeTopics(tables);
    const wanted = new Map(); // table -> Set of topics
    for (const t of body.topics) {
      if (!t || !tables.includes(t.table) || typeof t.topic !== 'string') continue;
      if (free.has(`${t.table}::${t.topic}`)) continue;
      if (!wanted.has(t.table)) wanted.set(t.table, new Set());
      wanted.get(t.table).add(t.topic);
    }
    if (!wanted.size) return fail(400, 'No locked lectures chosen');

    // How many from each table: the app's split, capped at 30 in all.
    let left = SET_SIZE;
    const plan = {};
    for (const table of tables) {
      const n = Math.max(0, Math.min(left, Math.floor(Number(body.plan[table]) || 0)));
      if (n && wanted.has(table)) { plan[table] = n; left -= n; }
    }

    const picked = [];
    const rowsByTable = {};
    await Promise.all(Object.entries(plan).map(async ([table, n]) => {
      const pool = (await allRows(table)).filter((r) => wanted.get(table).has(topicOf(r)));
      rowsByTable[table] = shuffle(pool).slice(0, n);
    }));
    for (const table of tables) for (const r of rowsByTable[table] || []) picked.push(`${table}:${r.id}`);
    if (!picked.length) return fail(400, 'Those lectures have no questions');
    const ids = shuffle(picked);

    // The primary key (user, subject, mode, day) turns a race between two
    // tabs into a conflict instead of a second set.
    const inserted = await db('/daily_sets?on_conflict=user_id,subject,mode,day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ user_id: caller.id, subject, mode, day, scope, question_ids: ids }),
    });
    if (!inserted?.length) return fail(409, `You have already used today's free ${mode}`);

    return json(201, { day, resets_at, set: { scope, ids, rows: rowsByTable } });
  } catch (e) {
    return fail(502, 'The daily set is unavailable right now', e);
  }
};
