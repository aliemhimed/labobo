/* Why-each-wrong-option-is-wrong notes (the option_notes column), in bulk.

     node scripts/option-notes.cjs export <scope> <dir>   questions -> <dir>/batch-NN.json
     node scripts/option-notes.cjs check  <dir>           validate <dir>/notes-NN.json
     node scripts/option-notes.cjs import <dir> [--write] save the notes (dry run without --write)

   Scopes are listed in SCOPES below. Export writes the questions in batches
   of BATCH for the writer to work through; the writer saves one
   notes-NN.json per batch-NN.json, shaped

     { "<table>:<id>": { "<wrong option index>": "note", ... }, ... }

   with indices into the stored `options` array. Import checks every note
   against the exported question (it must be a wrong option, not empty, not
   too long) and only fills rows whose option_notes is still empty, unless
   --overwrite is given. Uses PROD_SUPA_SERVICE_KEY from .env, like
   study-guides/publish.cjs; nothing is printed from it. */

const fs = require('fs');
const path = require('path');

const PROD_URL = 'https://boukmowybmtfqkinuvqj.supabase.co';
const BATCH = 40;
const MAX_NOTE = 320;

const lectureNo = (t) => { const m = /(?:Lec|Wk|Lecture)\s+0?(\d+)/.exec(t || ''); return m ? Number(m[1]) : null; };
const postMidterm = (r) => (lectureNo(r.topic) ?? 0) > 7 || /after midterm/i.test(r.topic || '');
const BS1_POST = new Set([
  'muscles_head', 'muscles_neck', 'muscles_thorax', 'muscles_back', 'muscles_abdomen', 'muscles_upper', 'muscles_lower',
  'nervous_org', 'membrane_ap', 'synapse_nmj', 'skeletal_excitation', 'skeletal_contraction', 'smooth_muscle',
  'cardiac_muscle', 'muscle_metabolism', 'nerve_muscle',
  'imaging_pelvis', 'imaging_muscles', 'imaging_head_neck', 'imaging_back', 'imaging_trunk', 'imaging_upper_muscles', 'imaging_lower_muscles',
]);

const SCOPES = {
  // GCT I after the midterm: lectures/weeks 8+ and Biochemistry's "After Midterm" cases and past papers.
  'gct1-post': { tables: ['gct_biochemistry', 'gct_genetics', 'gct_molecular_biology', 'gct_histology'], keep: postMidterm },
  // Body Systems I after the midterm: lectures 8+ (topics are stored as slugs).
  'bs1-post': { tables: ['bs_anatomy', 'bs_physiology', 'bs_imaging'], keep: (r) => BS1_POST.has(r.topic) },
};

function env() {
  try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch { /* the environment must have the key */ }
  const key = process.env.PROD_SUPA_SERVICE_KEY;
  if (!key) throw new Error('PROD_SUPA_SERVICE_KEY is not set in .env');
  return { url: PROD_URL, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } };
}

async function rows(db, table) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${db.url}/rest/v1/${table}?select=id,topic,q,options,answer,explanation,option_notes&order=ord.asc,id.asc`,
      { headers: { ...db.headers, Range: `${from}-${from + 999}` } });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

const pad = (n) => String(n).padStart(2, '0');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const batches = (dir) => fs.readdirSync(dir).filter((f) => /^batch-\d+\.json$/.test(f)).sort();

async function exportScope(scope, dir) {
  const s = SCOPES[scope];
  if (!s) throw new Error(`Unknown scope ${scope}. Known: ${Object.keys(SCOPES).join(', ')}`);
  const db = env();
  fs.mkdirSync(dir, { recursive: true });
  const list = [];
  for (const table of s.tables) {
    for (const r of await rows(db, table)) {
      if (!s.keep(r) || !Array.isArray(r.options)) continue;
      if (r.option_notes && Object.keys(r.option_notes).length) continue; // already done
      list.push({ key: `${table}:${r.id}`, topic: r.topic, q: r.q, options: r.options, answer: r.answer, explanation: r.explanation || '' });
    }
  }
  let n = 0;
  for (let i = 0; i < list.length; i += BATCH) {
    n++;
    fs.writeFileSync(path.join(dir, `batch-${pad(n)}.json`), JSON.stringify(list.slice(i, i + BATCH), null, 1));
  }
  console.log(`${scope}: ${list.length} questions without notes -> ${n} batches in ${dir}`);
}

/** Every problem in one batch's notes, as strings. */
function problems(batch, notes) {
  const out = [];
  const byKey = new Map(batch.map((q) => [q.key, q]));
  for (const [key, map] of Object.entries(notes)) {
    const q = byKey.get(key);
    if (!q) { out.push(`${key}: not in this batch`); continue; }
    for (const [k, v] of Object.entries(map || {})) {
      const i = Number(k);
      if (!Number.isInteger(i) || i < 0 || i >= q.options.length) out.push(`${key}: option ${k} does not exist`);
      else if (i === q.answer) out.push(`${key}: option ${k} is the correct answer`);
      else if (typeof v !== 'string' || !v.trim()) out.push(`${key}: option ${k} note is empty`);
      else if (v.length > MAX_NOTE) out.push(`${key}: option ${k} note is ${v.length} characters (max ${MAX_NOTE})`);
    }
  }
  const missing = batch.filter((q) => !notes[q.key]).length;
  return { out, missing };
}

function check(dir) {
  let total = 0, notesCount = 0, bad = 0, missing = 0, absent = [];
  for (const b of batches(dir)) {
    const nf = path.join(dir, b.replace('batch', 'notes'));
    const batch = readJson(path.join(dir, b));
    total += batch.length;
    if (!fs.existsSync(nf)) { absent.push(b); continue; }
    let notes;
    try { notes = readJson(nf); } catch (e) { console.log(`${nf}: not valid JSON (${e.message})`); bad++; continue; }
    const p = problems(batch, notes);
    p.out.forEach((m) => console.log(`${path.basename(nf)}: ${m}`));
    bad += p.out.length;
    missing += p.missing;
    notesCount += Object.values(notes).reduce((n, m) => n + Object.keys(m || {}).length, 0);
  }
  console.log(`${total} questions, ${notesCount} notes, ${bad} problems, ${missing} questions skipped, ${absent.length} batches not written${absent.length ? ': ' + absent.join(' ') : ''}`);
  return bad === 0;
}

async function importDir(dir, write, overwrite) {
  if (!check(dir)) throw new Error('Fix the problems above first.');
  const db = env();
  let saved = 0, skipped = 0;
  for (const b of batches(dir)) {
    const nf = path.join(dir, b.replace('batch', 'notes'));
    if (!fs.existsSync(nf)) continue;
    for (const [key, map] of Object.entries(readJson(nf))) {
      if (!map || !Object.keys(map).length) continue;
      const [table, id] = key.split(':');
      if (!write) { saved++; continue; }
      const filter = `id=eq.${encodeURIComponent(id)}${overwrite ? '' : '&option_notes=eq.%7B%7D'}`;
      const res = await fetch(`${db.url}/rest/v1/${table}?${filter}`, {
        method: 'PATCH', headers: { ...db.headers, Prefer: 'return=representation' }, body: JSON.stringify({ option_notes: map }),
      });
      if (!res.ok) throw new Error(`${key}: ${res.status} ${await res.text()}`);
      const changed = (await res.json()).length;
      if (changed) saved++; else skipped++;
    }
  }
  console.log(write ? `saved ${saved} questions, ${skipped} already had notes` : `dry run: would save ${saved} questions (add --write)`);
}

const [cmd, a, b] = process.argv.slice(2);
const flags = new Set(process.argv.slice(2).filter((x) => x.startsWith('--')));
(async () => {
  if (cmd === 'export') await exportScope(a, b);
  else if (cmd === 'check') process.exitCode = check(a) ? 0 : 1;
  else if (cmd === 'import') await importDir(a, flags.has('--write'), flags.has('--overwrite'));
  else console.log('usage: export <scope> <dir> | check <dir> | import <dir> [--write] [--overwrite]');
})().catch((e) => { console.error(e.message); process.exit(1); });
