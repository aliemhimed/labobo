/* Netlify Function: questions — public read endpoint for the question banks.
   Why: the banks used to be inlined into each HTML page. They now live in
   Supabase, and this proxies the reads through our own domain for the same
   reason supa-insert.js exists — ad blockers (uBlock, AdGuard, Brave) block
   requests to *.supabase.co directly.

   GET /api/questions?tables=bs_anatomy,bs_physiology
     -> { tables: { bs_anatomy: [...], bs_physiology: [...] } }

   Rows come back ordered by `ord`, then `id`, so question indices are stable
   between loads. Only the tables in ALLOWED_TABLES can be read. */

const SUPA_URL = 'https://boukmowybmtfqkinuvqj.supabase.co';
const SUPA_KEY = 'sb_publishable_LLpEKdQRvePMYJ5b7loUKA_SeZ51lJs';

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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
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
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  }

  const raw = (event.queryStringParameters || {}).tables || '';
  const requested = raw.split(',').map((t) => t.trim()).filter(Boolean);

  if (!requested.length) {
    return {
      statusCode: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing ?tables=' }),
    };
  }
  const bad = requested.filter((t) => !ALLOWED_TABLES.includes(t));
  if (bad.length) {
    return {
      statusCode: 403,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Table not allowed: ${bad.join(', ')}` }),
    };
  }

  try {
    const results = await Promise.all(requested.map(fetchTable));
    const tables = {};
    requested.forEach((t, i) => { tables[t] = results[i]; });
    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        // Questions change rarely; let the CDN carry the load.
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      },
      body: JSON.stringify({ tables }),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(e.message || e) }),
    };
  }
};
