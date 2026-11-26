/* A raw question-bank row turned into { q, options, answer, explanation,
   image }, the same way the site does it in the browser
   (src/lib/questions.js: normalizeOptions, normalizeAnswer, normalizeImages),
   so a student-hosted Live room shows questions exactly as practice mode does.
   Used where the server builds a room from bank ids itself (live.js), rather
   than trusting question text sent by a student. Keep the two in step. */

function normalizeOptions(raw) {
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  if (raw && typeof raw === 'object') return Object.values(raw).map((o) => String(o));
  return [];
}

function normalizeAnswer(raw, options, originalOptions) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (originalOptions && !Array.isArray(originalOptions)) {
      const byKey = Object.keys(originalOptions).indexOf(s);
      if (byKey !== -1) return byKey;
    }
    if (/^[A-Fa-f]$/.test(s)) return s.toUpperCase().charCodeAt(0) - 65;
    const n = parseInt(s, 10);
    if (Number.isFinite(n)) return n;
    const byText = options.indexOf(s);
    if (byText !== -1) return byText;
  }
  return 0;
}

const WEBP_FOLDERS = /^\/images\/(medart|histo|organelles)\//;
const webpIfLocal = (url) => (WEBP_FOLDERS.test(url) ? url.replace(/\.(png|jpe?g)$/i, '.webp') : url);
// Only Medicine & Art keeps its pictures in its own folder (src/lib/subjects.js imageBase).
const IMAGE_BASE = { medicine_art: '/images/medart/' };

/** The row's first picture as a site path, or ''. */
function firstImage(row, table) {
  const list = [];
  if (Array.isArray(row.images)) list.push(...row.images);
  if (row.image) list.push(row.image);
  const name = list.map((n) => String(n).trim()).find(Boolean);
  if (!name) return '';
  if (/^(https?:)?\/\//.test(name)) return '';
  if (name.startsWith('/')) return webpIfLocal(name);
  if (name.includes('/')) return webpIfLocal('/' + name.replace(/^\.?\//, ''));
  return webpIfLocal((IMAGE_BASE[table] || '/images/') + name);
}

function bankQuestion(row, table) {
  const options = normalizeOptions(row.options);
  return {
    q: String(row.q || ''),
    options,
    answer: normalizeAnswer(row.answer, options, row.options),
    explanation: row.explanation || '',
    image: firstImage(row, table),
    source_table: table,
    source_id: row.id,
    custom_id: null,
  };
}

module.exports = { bankQuestion };
