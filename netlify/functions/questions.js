/* Netlify Function: questions — read endpoint for the question banks.
   Why: the banks live in Supabase, and this proxies the reads through our
   own domain because ad blockers (uBlock, AdGuard, Brave) block requests to
   *.supabase.co directly.

   GET /api/questions?tables=bs_anatomy,bs_physiology   (Authorization optional)
     -> { tables: { bs_anatomy: [...], bs_physiology: [...] },
          access: 'open' | 'full' | 'free',
          locked: { bs_anatomy: [{ topic, n }], ... } }

   Rows come back ordered by `ord`, then `id`, so question indices are stable
   between loads. Only the tables in ALLOWED_TABLES can be read.

   Before subscriptions start (see _lib/access.js) every caller gets the
   whole bank and the response is public and CDN-cached. Afterwards:
     - a signed-in student with a pass or a running trial gets the whole
       bank (`access: 'full'`);
     - everyone else gets only the free lectures (`access: 'free'`), plus
       `locked`: the name and question count of every lecture they are not
       shown, so the app can list them with a lock.

   GET /api/questions?counts=1&tables=bs_anatomy,bs_physiology
     -> { counts: { bs_anatomy: 120, bs_physiology: 95 } }

   Row counts only, for the home page cards. Tiny and CDN-cached, so the
   home page makes one request here instead of one Supabase count per table.
   A table that fails to count comes back as null rather than failing the
   whole response. Counts are of the whole bank, locked lectures included. */

const { SUPA_URL, anonHeaders, dbHeaders, fail, verifyUser } = require('./_lib/common');
const { LOCK_START, isLocked, getAccess, hasFullAccess } = require('./_lib/access');

// Keep in sync with ALL_QUESTION_TABLES in src/lib/subjects.js
const ALLOWED_TABLES = [
  'gct_biochemistry',
  'gct_genetics',
  'gct_molecular_biology',
  'gct_histology',
  'medical_chemistry',
  'medical_physics',
  'clinical_skills',
  'bs_anatomy',
  'bs_physiology',
  'bs_imaging',
  'medicine_art',
  // Semester 2
  'gct2_biochemistry',
  'gct2_genetics',
  'gct2_molecular_biology',
  'gct2_histology',
  'bs2_anatomy',
  'bs2_physiology',
  'bs2_imaging',
  'clinical_skills_2',
  'scientific_reasoning',
  // Both semesters
  'history_of_medicine',
  // Semester 4
  'gct4_immunology',
  'gct4_microbiology',
  'bs4_anatomy',
  'bs4_physiology',
  'bs4_imaging',
];

// Any origin may fetch this; what a caller gets depends on their token.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Netlify Functions reject responses over ~6 MB, so ask for a few tables at
// a time and refuse to send more than fits.
const MAX_TABLES = 6;
const MAX_BODY_BYTES = 5.5 * 1024 * 1024;

// Supabase caps a single REST response; page through anything larger.
const PAGE_SIZE = 1000;

const BASE_COLS = 'id,ord,topic,q,options,answer,explanation,image,images';
// Only the clinical skills banks have a display_topic column; asking for it elsewhere 400s.
const TABLES_WITH_DISPLAY_TOPIC = ['clinical_skills', 'clinical_skills_2'];

function selectFor(table) {
  return TABLES_WITH_DISPLAY_TOPIC.includes(table) ? `${BASE_COLS},display_topic` : BASE_COLS;
}

/** The lecture name students see, which is also what free_topics lists. */
const topicOf = (row) => row.display_topic || row.topic || '';

async function fetchTable(table, headers) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${table}?select=${selectFor(table)}&order=ord.asc,id.asc`,
      {
        headers: {
          ...headers,
          Range: `${from}-${from + PAGE_SIZE - 1}`,
          'Range-Unit': 'items',
        },
      }
    );
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

/** { table: Set of free lecture names } for the requested tables. */
async function fetchFreeTopics(tables) {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/free_topics?tb=in.(${tables.join(',')})&select=tb,topic`,
    { headers: anonHeaders() }
  );
  if (!res.ok) throw new Error(`free_topics: ${res.status} ${await res.text()}`);
  const free = Object.fromEntries(tables.map((t) => [t, new Set()]));
  for (const r of await res.json()) free[r.tb]?.add(r.topic);
  return free;
}

async function countTable(table) {
  try {
    // The service key, so the count covers locked lectures too; fall back to
    // the publishable key where the service key is not configured.
    let headers;
    try { headers = dbHeaders(); } catch { headers = anonHeaders(); }
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?select=id`, {
      headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const total = parseInt((res.headers.get('content-range') || '').split('/')[1], 10);
    return Number.isFinite(total) ? total : null;
  } catch (e) {
    console.error(`[counts] ${table}`, e);
    return null;
  }
}

/* Public responses may sit in the CDN for five minutes and be served stale
   for a day. Neither may reach past the moment subscriptions start, or the
   CDN would keep handing out the whole bank after the lock. */
function publicCache() {
  const secondsToLock = Math.floor((LOCK_START.getTime() - Date.now()) / 1000);
  if (secondsToLock > 86400 + 300) return 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';
  const ttl = Math.max(0, Math.min(300, secondsToLock));
  return ttl > 0 ? `public, max-age=${Math.min(60, ttl)}, s-maxage=${ttl}` : 'private, no-store';
}

async function countsReply(tables) {
  const results = await Promise.all(tables.map(countTable));
  const counts = {};
  tables.forEach((t, i) => { counts[t] = results[i]; });
  // Do not let the CDN hold on to a partial answer.
  const cache = results.includes(null)
    ? 'no-store'
    : 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';
  return {
    statusCode: 200,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': cache },
    body: JSON.stringify({ counts }),
  };
}

exports.handler = async (event) => {
  const reply = (r) => ({ ...r, headers: { ...r.headers, ...CORS } });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return reply(fail(405, 'Method not allowed'));

  const params = event.queryStringParameters || {};
  const raw = params.tables || '';
  const requested = [...new Set(raw.split(',').map((t) => t.trim()).filter(Boolean))];

  if (!requested.length) return reply(fail(400, 'Missing ?tables='));
  const bad = requested.filter((t) => !ALLOWED_TABLES.includes(t));
  if (bad.length) return reply(fail(403, `Table not allowed: ${bad.join(', ')}`));
  // Counts are a few bytes per table, so the MAX_TABLES size cap does not apply.
  if (params.counts === '1') return countsReply(requested);
  if (requested.length > MAX_TABLES) return reply(fail(400, `Ask for at most ${MAX_TABLES} tables at a time`));

  try {
    const locked = isLocked();
    let full = true;
    if (locked) full = hasFullAccess(await getAccess(await verifyUser(event)));

    // Once the lock is on, the publishable key only reaches the free rows.
    const results = await Promise.all(requested.map((t) => fetchTable(t, locked ? dbHeaders() : anonHeaders())));
    const tables = {};
    const lockedTopics = {};

    if (full) {
      requested.forEach((t, i) => { tables[t] = results[i]; });
    } else {
      const free = await fetchFreeTopics(requested);
      requested.forEach((t, i) => {
        const hidden = new Map();
        tables[t] = results[i].filter((row) => {
          const topic = topicOf(row);
          if (free[t].has(topic)) return true;
          hidden.set(topic, (hidden.get(topic) || 0) + 1);
          return false;
        });
        lockedTopics[t] = [...hidden].map(([topic, n]) => ({ topic, n }));
      });
    }

    const body = JSON.stringify({ tables, access: !locked ? 'open' : full ? 'full' : 'free', locked: lockedTopics });
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      return reply(fail(413, 'Response too large; request fewer tables'));
    }
    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        // Questions change rarely; while everything is open let the CDN
        // carry the load. A locked answer depends on who asks.
        'Cache-Control': locked ? 'private, no-store' : publicCache(),
        ...(locked ? { Vary: 'Authorization' } : {}),
      },
      body,
    };
  } catch (e) {
    return reply(fail(502, 'Questions are unavailable right now', e));
  }
};
