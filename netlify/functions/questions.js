/* Netlify Function: questions — public read endpoint for the question banks.
   Why: the banks used to be inlined into each HTML page. They now live in
   Supabase, and this proxies the reads through our own domain for the same
   reason supa-insert.js exists — ad blockers (uBlock, AdGuard, Brave) block
   requests to *.supabase.co directly.

   GET /api/questions?tables=bs_anatomy,bs_physiology
     -> { tables: { bs_anatomy: [...], bs_physiology: [...] } }

   Rows come back ordered by `ord`, then `id`, so question indices are stable
   between loads. Only the tables in ALLOWED_TABLES can be read.

   GET /api/questions?counts=1&tables=bs_anatomy,bs_physiology
     -> { counts: { bs_anatomy: 120, bs_physiology: 95 } }

   Row counts only, for the home page cards. Tiny and CDN-cached, so the
   home page makes one request here instead of one Supabase count per table.
   A table that fails to count comes back as null rather than failing the
   whole response. */

const { SUPA_URL, anonHeaders, fail } = require('./_lib/common');

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
  // Semester 2 (empty until content is added)
  'gct2_biochemistry',
  'gct2_genetics',
  'gct2_molecular_biology',
  'gct2_histology',
  'bs2_anatomy',
  'bs2_physiology',
  'bs2_imaging',
  'clinical_skills_2',
  'medicine_art_2',
  'midterm_biochemistry',
  'midterm_molecular_biology',
  'midterm_genetics',
  'midterm_histology',
];

// Public, read-only data: any origin may fetch it.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Netlify Functions reject responses over ~6 MB, so ask for a few tables at
// a time and refuse to send more than fits.
const MAX_TABLES = 6;
const MAX_BODY_BYTES = 5.5 * 1024 * 1024;

// Supabase caps a single REST response; page through anything larger.
const PAGE_SIZE = 1000;

const BASE_COLS = 'id,ord,topic,q,options,answer,explanation,image,images';
// Only clinical_skills has a display_topic column; asking for it elsewhere 400s.
const TABLES_WITH_DISPLAY_TOPIC = ['clinical_skills', 'clinical_skills_2'];

function selectFor(table) {
  return TABLES_WITH_DISPLAY_TOPIC.includes(table) ? `${BASE_COLS},display_topic` : BASE_COLS;
}

async function fetchTable(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${table}?select=${selectFor(table)}&order=ord.asc,id.asc`,
      {
        headers: {
          ...anonHeaders(),
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

async function countTable(table) {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?select=id`, {
      headers: { ...anonHeaders(), Prefer: 'count=exact', Range: '0-0' },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const total = parseInt((res.headers.get('content-range') || '').split('/')[1], 10);
    return Number.isFinite(total) ? total : null;
  } catch (e) {
    console.error(`[counts] ${table}`, e);
    return null;
  }
}

async function countsReply(tables) {
  const results = await Promise.all(tables.map(countTable));
  const counts = {};
  tables.forEach((t, i) => { counts[t] = results[i]; });
  // Don't let the CDN hold on to a partial answer.
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
  // Counts are a few bytes per table, so the MAX_TABLES size cap doesn't apply.
  if (params.counts === '1') return countsReply(requested);
  if (requested.length > MAX_TABLES) return reply(fail(400, `Ask for at most ${MAX_TABLES} tables at a time`));

  try {
    const results = await Promise.all(requested.map(fetchTable));
    const tables = {};
    requested.forEach((t, i) => { tables[t] = results[i]; });
    const body = JSON.stringify({ tables });
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      return reply(fail(413, 'Response too large; request fewer tables'));
    }
    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        // Questions change rarely; let the CDN carry the load.
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      },
      body,
    };
  } catch (e) {
    return reply(fail(502, 'Questions are unavailable right now', e));
  }
};
