/* Netlify Function: questions — public read endpoint for the question banks.
   Why: the banks used to be inlined into each HTML page. They now live in
   Supabase, and this proxies the reads through our own domain for the same
   reason supa-insert.js exists — ad blockers (uBlock, AdGuard, Brave) block
   requests to *.supabase.co directly.

   GET /api/questions?tables=bs_anatomy,bs_physiology
     -> { tables: { bs_anatomy: [...], bs_physiology: [...] } }

   Rows come back ordered by `ord`, then `id`, so question indices are stable
   between loads. Only the tables in ALLOWED_TABLES can be read. */

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
const TABLES_WITH_DISPLAY_TOPIC = ['clinical_skills'];

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

exports.handler = async (event) => {
  const reply = (r) => ({ ...r, headers: { ...r.headers, ...CORS } });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return reply(fail(405, 'Method not allowed'));

  const raw = (event.queryStringParameters || {}).tables || '';
  const requested = [...new Set(raw.split(',').map((t) => t.trim()).filter(Boolean))];

  if (!requested.length) return reply(fail(400, 'Missing ?tables='));
  if (requested.length > MAX_TABLES) return reply(fail(400, `Ask for at most ${MAX_TABLES} tables at a time`));
  const bad = requested.filter((t) => !ALLOWED_TABLES.includes(t));
  if (bad.length) return reply(fail(403, `Table not allowed: ${bad.join(', ')}`));

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
