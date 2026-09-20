import { SUPA_URL, SUPA_HEADERS } from './supabase.js';

/* ============================================================
   QUESTION LOADER
   ------------------------------------------------------------
   Questions live in per-subject Supabase tables. We read them
   through /api/questions (our own domain) because ad blockers
   drop requests to *.supabase.co; if that endpoint isn't there
   — plain `vite dev` without `netlify dev`, or a static host
   with no functions — we fall back to Supabase REST directly.
   ============================================================ */

const PAGE_SIZE = 1000;
const BASE_COLS = 'id,ord,topic,q,options,answer,explanation,image,images';
/* Only clinical_skills carries a display_topic column; asking for it on any
   other table makes PostgREST return 400. */
const selectFor = (source) => (source.displayTopic ? `${BASE_COLS},display_topic` : BASE_COLS);

/* Rows are authored by hand in the Supabase dashboard, so be forgiving
   about shape: options may be an array or an {A,B,C,D} object, and answer
   may be a 0-based index or a letter. */
function normalizeOptions(raw) {
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  if (raw && typeof raw === 'object') return Object.values(raw).map((o) => String(o));
  return [];
}

function normalizeAnswer(raw, options, originalOptions) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    // "B" / "b" -> index, but only when the options came from an object
    // whose keys are those same letters.
    if (originalOptions && !Array.isArray(originalOptions)) {
      const keys = Object.keys(originalOptions);
      const byKey = keys.indexOf(s);
      if (byKey !== -1) return byKey;
    }
    if (/^[A-Fa-f]$/.test(s)) return s.toUpperCase().charCodeAt(0) - 65;
    const n = parseInt(s, 10);
    if (Number.isFinite(n)) return n;
    // last resort: match the answer text against an option
    const byText = options.indexOf(s);
    if (byText !== -1) return byText;
  }
  return 0;
}

function normalizeImages(row, imageBase) {
  const list = [];
  if (Array.isArray(row.images)) list.push(...row.images);
  if (row.image) list.push(row.image);
  return list
    .map((name) => String(name).trim())
    .filter(Boolean)
    .map((name) => {
      // Absolute URLs and rooted paths are used as-is; bare filenames get
      // the subject's image folder prefixed.
      if (/^(https?:)?\/\//.test(name) || name.startsWith('/')) return name;
      if (name.includes('/')) return '/' + name.replace(/^\.?\//, '');
      return (imageBase || '/images/') + name;
    });
}

function toQuestion(row, subject, topicMap, imageBase) {
  const options = normalizeOptions(row.options);
  const rawTopic = row.display_topic || row.topic || '';
  return {
    id: `${row.__table}:${row.id}`,
    subject,
    topic: (topicMap && topicMap[rawTopic]) || rawTopic || 'General',
    q: String(row.q || ''),
    options,
    answer: normalizeAnswer(row.answer, options, row.options),
    explanation: row.explanation || '',
    images: normalizeImages(row, imageBase),
  };
}

let warnedAboutApi = false;

async function viaApi(tables, signal) {
  const res = await fetch(`/api/questions?tables=${encodeURIComponent(tables.join(','))}`, { signal });
  if (!res.ok) throw new Error(`/api/questions -> ${res.status}`);
  const body = await res.json();
  if (!body || !body.tables) throw new Error('/api/questions returned no tables');
  return body.tables;
}

async function viaSupabaseDirect(sources, signal) {
  const out = {};
  await Promise.all(
    sources.map(async (source) => {
      const table = source.table;
      const rows = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const res = await fetch(
          `${SUPA_URL}/rest/v1/${table}?select=${selectFor(source)}&order=ord.asc,id.asc`,
          {
            signal,
            headers: {
              ...SUPA_HEADERS,
              Range: `${from}-${from + PAGE_SIZE - 1}`,
              'Range-Unit': 'items',
            },
          }
        );
        if (!res.ok) throw new Error(`${table}: ${res.status}`);
        const batch = await res.json();
        rows.push(...batch);
        if (batch.length < PAGE_SIZE) break;
      }
      out[table] = rows;
    })
  );
  return out;
}

/**
 * Load and flatten every table a subject draws from.
 * @param {{sources: {table: string, subject: string}[], topicMap?: object, imageBase?: string}} config
 * @returns {Promise<Array>} questions in a stable order
 */
export async function loadQuestions(config, signal) {
  const tables = config.sources.map((s) => s.table);
  let byTable;
  try {
    byTable = await viaApi(tables, signal);
  } catch (e) {
    if (signal?.aborted) throw e;
    if (!warnedAboutApi) {
      warnedAboutApi = true;
      console.info('[questions] /api/questions unavailable — reading Supabase directly.', e.message);
    }
    byTable = await viaSupabaseDirect(config.sources, signal);
  }

  const questions = [];
  for (const src of config.sources) {
    const rows = byTable[src.table] || [];
    for (const row of rows) {
      row.__table = src.table;
      const q = toQuestion(row, src.subject, config.topicMap, config.imageBase);
      // A question with no options can't be answered — skip rather than
      // render a broken card.
      if (q.q && q.options.length >= 2) questions.push(q);
    }
  }
  return questions;
}

/** subject -> topic -> [indices into the questions array] */
export function buildSubjectIndex(questions) {
  const index = {};
  questions.forEach((q, i) => {
    if (!index[q.subject]) index[q.subject] = {};
    if (!index[q.subject][q.topic]) index[q.subject][q.topic] = [];
    index[q.subject][q.topic].push(i);
  });
  return index;
}
