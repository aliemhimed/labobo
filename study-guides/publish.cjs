/* Publishes the study guides that are ready. They live in Supabase, not in
   the site build, so a guide is on the site as soon as this finishes, with
   no deploy.

     node study-guides/publish.cjs           to the project in .env (SUPA_URL, SUPA_SERVICE_KEY)
     node study-guides/publish.cjs --prod    to the live site (PROD_SUPA_SERVICE_KEY in .env)
     node study-guides/publish.cjs --dry     check and count only, change nothing

   PUBLISH says which guides go live. For each one this script
     - puts the guide (an <article class="lb-guide"> fragment) and its list
       details (title, lectures, counts) in the study_guides table, which
       netlify/functions/guide.js serves with the same access rule as the
       questions,
     - uploads the pictures it uses to the public guide-images bucket; the
       site shows them as /guides/img/... (public/_redirects).
   Guides and pictures that are no longer in PUBLISH are removed, so taking a
   guide out takes it off the site. Unchanged pictures are not sent again.
   A picture that changes should get a new file name: browsers keep the old
   one for a week. Run build.cjs first: it checks the guides.

   It also writes study-guides/preview/guides.json, the list the dev-only
   preview page (/dev/guides) uses. */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = path.join(ROOT, '..');
const PREVIEW_LIST = path.join(ROOT, 'preview', 'guides.json');
const BUCKET = 'guide-images';
const PROD_URL = 'https://boukmowybmtfqkinuvqj.supabase.co';
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const DRY = process.argv.includes('--dry');
const PROD = process.argv.includes('--prod');

// GCT I, pre-midterm: lectures and weeks 1–7 of every part. GCT II: every guide in study-guides/gct-2.
const PUBLISH = {
  gct: {
    scope: 'pre-midterm',
    note: 'up to the midterm',
    include: (g) => typeof g.lecture === 'number' && g.lecture <= 7,
    // Each part's question table: a guide is free when its lectures are in free_topics for it.
    tables: { Biochemistry: 'gct_biochemistry', 'Medical Genetics': 'gct_genetics', 'Molecular Biology': 'gct_molecular_biology', Histology: 'gct_histology' },
  },
  // GCT II: every guide written so far.
  'gct-2': {
    scope: 'lectures',
    note: 'covered so far',
    include: (g) => typeof g.lecture === 'number',
    tables: { Biochemistry: 'gct2_biochemistry', 'Medical Genetics': 'gct2_genetics', 'Molecular Biology': 'gct2_molecular_biology', Histology: 'gct2_histology' },
  },
  'gct-3': {
    scope: 'lectures',
    note: 'covered so far',
    include: (g) => typeof g.lecture === 'number',
    tables: { Biochemistry: 'gct3_biochemistry', Immunology: 'gct3_immunology', Biophysics: 'gct3_biophysics' },
  },
};
const PART_ORDER = ['Biochemistry', 'Medical Genetics', 'Molecular Biology', 'Histology'];

const attr = (html, name) => new RegExp(`data-${name}="([^"]*)"`).exec(html)?.[1] || '';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&rsquo;/g, '’');
const text = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function describe(subject, rel, html) {
  const [part, file] = rel.split('/').slice(-2);
  const slug = file.replace(/\.html$/, '');
  const body = html.replace(/<details class="lb-slidemap">[\s\S]*?<\/details>/, '');
  const lectures = attr(html, 'lectures');
  return {
    subject,
    part: attr(html, 'part'),
    folder: part,
    slug,
    path: `${part}/${slug}`,
    lecture: /^\d+/.test(lectures) ? Number(lectures.match(/^\d+/)[0]) : null,
    label: text((/class="lb-kicker">([^<]*)/.exec(html) || [])[1] || '').split('·').pop().trim(),
    title: text((/<h1>([\s\S]*?)<\/h1>/.exec(html) || [])[1] || ''),
    lede: text((/class="lb-lede">([\s\S]*?)<\/p>/.exec(html) || [])[1] || ''),
    topics: decode(attr(html, 'topic')).split(/;\s*/).filter(Boolean),
    minutes: Math.max(5, Math.round(text(body).split(' ').length / 200)),
    videos: (html.match(/<li><a href="https:\/\/www\.youtube\.com/g) || []).length,
    pictures: (html.match(/<figure class="lb-figure"/g) || []).length,
    quiz: (html.match(/class="lb-q"/g) || []).length,
  };
}

const manifest = {};
const rows = [];
const pictures = new Map(); // "drawn/x.jpg" -> file on disk
for (const [subject, rule] of Object.entries(PUBLISH)) {
  const dir = path.join(ROOT, subject);
  const guides = [];
  for (const part of fs.readdirSync(dir)) {
    for (const file of fs.readdirSync(path.join(dir, part)).filter((f) => f.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(dir, part, file), 'utf8');
      const g = describe(subject, `${part}/${file}`, html);
      if (!rule.include(g)) continue;
      g.table = rule.tables[g.part] || null;
      for (const [, src] of html.matchAll(/<img\b[^>]*\ssrc="\/guides\/img\/([^"]+)"/g)) {
        const from = path.join(ROOT, 'img', src);
        if (!fs.existsSync(from)) throw new Error(`${part}/${file}: missing picture img/${src}`);
        if (!MIME[path.extname(src).toLowerCase()]) throw new Error(`${part}/${file}: ${src} is not a jpg, png or webp`);
        pictures.set(src, from);
      }
      guides.push({ ...g, html });
    }
  }
  guides.sort((a, b) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part) || (a.lecture ?? 99) - (b.lecture ?? 99));
  guides.forEach(({ html, table, ...g }, ord) => rows.push({ ...g, tb: table, ord, html }));
  manifest[subject] = {
    scope: rule.scope,
    note: rule.note,
    parts: PART_ORDER.filter((p) => guides.some((g) => g.part === p)),
    guides: guides.map(({ html, ...g }) => g),
  };
}

fs.mkdirSync(path.dirname(PREVIEW_LIST), { recursive: true });
fs.writeFileSync(PREVIEW_LIST, JSON.stringify(manifest, null, 1) + '\n');
for (const [s, m] of Object.entries(manifest)) {
  console.log(`${s}: ${m.guides.length} guides (${m.parts.map((p) => `${p} ${m.guides.filter((g) => g.part === p).length}`).join(', ')})`);
}
const mb = (n) => (n / 1048576).toFixed(1);
console.log(`${rows.length} guides (${mb(rows.reduce((n, r) => n + Buffer.byteLength(r.html), 0))} MB of text), ${pictures.size} pictures (${mb([...pictures.values()].reduce((n, f) => n + fs.statSync(f).size, 0))} MB)`);

/* ── Supabase ─────────────────────────────────────────────────────────── */

function target() {
  try { process.loadEnvFile(path.join(SITE, '.env')); } catch { /* no .env: the environment must have the keys */ }
  const url = (PROD ? PROD_URL : process.env.SUPA_URL || '').replace(/\/$/, '');
  const key = PROD ? process.env.PROD_SUPA_SERVICE_KEY : process.env.SUPA_SERVICE_KEY;
  if (!url) throw new Error('SUPA_URL is not set in .env (or pass --prod for the live site)');
  if (!key) throw new Error(`${PROD ? 'PROD_SUPA_SERVICE_KEY' : 'SUPA_SERVICE_KEY'} is not set in .env`);
  if (!PROD && url === PROD_URL) throw new Error('SUPA_URL is the live site: pass --prod to publish there');
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

async function publish() {
  const { url, headers } = target();
  console.log(`\nPublishing to ${new URL(url).host}${PROD ? ' (the live site)' : ''}`);
  const call = async (what, p, init = {}) => {
    const res = await fetch(url + p, { ...init, headers: { ...headers, ...init.headers } });
    if (!res.ok) throw new Error(`${what}: ${res.status} ${await res.text()}`);
    return res;
  };
  const jsonBody = (body, extra = {}) => ({ body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...extra } });

  // What the bucket holds now: { "drawn/x.jpg": bytes }.
  const have = new Map();
  const walk = async (prefix) => {
    for (let offset = 0; ; offset += 1000) {
      const res = await call('list pictures', `/storage/v1/object/list/${BUCKET}`, { method: 'POST', ...jsonBody({ prefix, limit: 1000, offset }) });
      const items = await res.json();
      for (const it of items) {
        const name = prefix ? `${prefix}/${it.name}` : it.name;
        if (it.id) have.set(name, it.metadata?.size);
        else await walk(name);
      }
      if (items.length < 1000) return;
    }
  };
  await walk('');

  // Pictures first, so a guide never points at one that is not there yet.
  let sent = 0;
  for (const [name, file] of pictures) {
    const data = fs.readFileSync(file);
    if (have.get(name) === data.length) continue;
    await call(`upload ${name}`, `/storage/v1/object/${BUCKET}/${name.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST',
      body: data,
      headers: { 'Content-Type': MIME[path.extname(name).toLowerCase()], 'x-upsert': 'true', 'cache-control': 'max-age=604800' },
    });
    sent++;
    if (sent % 25 === 0) console.log(`  ${sent} pictures sent…`);
  }

  const merge = { Prefer: 'resolution=merge-duplicates,return=minimal' };
  const now = new Date().toISOString();
  await call('save guide sets', '/rest/v1/study_guide_sets', {
    method: 'POST',
    ...jsonBody(Object.entries(manifest).map(([subject, m]) => ({ subject, scope: m.scope, note: m.note, parts: m.parts, updated_at: now })), merge),
  });
  for (let i = 0; i < rows.length; i += 20) {
    await call('save guides', '/rest/v1/study_guides', {
      method: 'POST',
      ...jsonBody(rows.slice(i, i + 20).map((r) => ({ ...r, updated_at: now })), merge),
    });
  }

  // Take away what is no longer published: guides, whole subjects, pictures.
  const subjects = Object.keys(manifest);
  const quoted = (list) => encodeURIComponent(list.map((x) => `"${x}"`).join(','));
  let gone = 0;
  for (const subject of subjects) {
    const keep = rows.filter((r) => r.subject === subject).map((r) => r.path);
    const res = await call('remove old guides', `/rest/v1/study_guides?subject=eq.${subject}&path=not.in.(${quoted(keep)})`, {
      method: 'DELETE', headers: { Prefer: 'return=representation' },
    });
    gone += (await res.json()).length;
  }
  await call('remove old subjects', `/rest/v1/study_guide_sets?subject=not.in.(${quoted(subjects)})`, { method: 'DELETE' });
  const stale = [...have.keys()].filter((name) => !pictures.has(name));
  for (let i = 0; i < stale.length; i += 100) {
    await call('remove old pictures', `/storage/v1/object/${BUCKET}`, { method: 'DELETE', ...jsonBody({ prefixes: stale.slice(i, i + 100) }) });
  }

  console.log(`Done: ${rows.length} guides saved${gone ? `, ${gone} removed` : ''}; ${sent} pictures sent, ${pictures.size - sent} unchanged${stale.length ? `, ${stale.length} removed` : ''}.`);
}

if (DRY) console.log('\n--dry: nothing was changed.');
else publish().catch((e) => { console.error(`\nNot published: ${e.message}`); process.exit(1); });
