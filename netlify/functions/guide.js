/* Netlify Function: study guides, with the same rule as the questions: the
   free lectures (free_topics) are open to everyone, the rest need a pass or
   trial on an allowed device. Unlike the questions, this applies right away,
   not only from LOCK_START.

   GET /api/guide?catalog=1
     -> { "<subject>": { scope, note, parts, guides: [...] } }
        every subject's guide list (titles and counts, no guide text)
   GET /api/guide?subject=gct&path=genetics/wk02-dominance-abo
       (Authorization: Bearer <token> when signed in)
     -> 200 text/html   the guide (an <article class="lb-guide"> fragment)
        401 / 403 JSON  { error, locked: true } when it needs a pass
   GET /api/guide?subject=gct&list=1
     -> { open: { "<path>": true | false } }   which guides this caller can read

   The guides live in the database (study_guides, written by
   study-guides/publish.cjs) and only the service key reads them, so a locked
   guide cannot be read by guessing its address and a new guide needs no
   deploy. The pictures are public, in the guide-images storage bucket, and
   reach the browser as /guides/img/... (public/_redirects). */

const { SUPA_URL, anonHeaders, dbHeaders, json, fail, verifyUser } = require('./_lib/common');
const { getAccess } = require('./_lib/access');
const { readDevice, checkDevice } = require('./_lib/devices');

const LIST_COLS = 'subject,path,part,folder,slug,lecture,label,title,lede,topics,minutes,videos,pictures,quiz,table:tb';

async function rows(query) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${query}`, { headers: dbHeaders() });
  if (!res.ok) throw new Error(`${query.split('?')[0]}: ${res.status} ${await res.text()}`);
  return res.json();
}

const guidesOf = (subject, cols) => rows(
  `study_guides?subject=eq.${encodeURIComponent(subject)}&select=${cols}&order=ord.asc`,
);

/** Set of "<table>::<topic>" that are free. */
async function freeTopics(tables) {
  if (!tables.length) return new Set();
  const res = await fetch(
    `${SUPA_URL}/rest/v1/free_topics?tb=in.(${tables.map(encodeURIComponent).join(',')})&select=tb,topic`,
    { headers: anonHeaders() },
  );
  if (!res.ok) throw new Error(`free_topics: ${res.status} ${await res.text()}`);
  return new Set((await res.json()).map((r) => `${r.tb}::${r.topic}`));
}

const isFree = (guide, free) => guide.topics.length > 0 && guide.topics.every((t) => free.has(`${guide.table}::${t}`));

/** True when the caller has a pass or trial and this device may use it. */
async function hasPass(event) {
  const caller = await verifyUser(event);
  if (!caller) return { ok: false, signedIn: false };
  const access = await getAccess(caller, event);
  if (access.kind !== 'pass' && access.kind !== 'trial') return { ok: false, signedIn: true };
  // getAccess only checks devices once questions lock; guides lock now, so check here too.
  const device = access.device || await checkDevice(caller.id, readDevice(event));
  return { ok: device.ok !== false, signedIn: true, otherDevice: device.ok === false };
}

const html = (body, cache) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' },
  body,
});

/** Every subject's guide list. The same for everyone, so the CDN may keep it. */
async function catalog() {
  const [sets, guides] = await Promise.all([
    rows('study_guide_sets?select=subject,scope,note,parts'),
    rows(`study_guides?select=${LIST_COLS}&order=subject.asc,ord.asc`),
  ]);
  const out = {};
  for (const s of sets) {
    const mine = guides.filter((g) => g.subject === s.subject);
    if (mine.length) out[s.subject] = { scope: s.scope, note: s.note, parts: s.parts, guides: mine };
  }
  return json(200, out, { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400' });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'GET') return fail(405, 'Method not allowed');
  const { subject = '', path = '', list, catalog: wantCatalog } = event.queryStringParameters || {};

  try {
    if (wantCatalog) return await catalog();

    if (list) {
      const guides = await guidesOf(subject, 'path,topics,table:tb');
      if (!guides.length) return fail(404, 'No study guides for this subject');
      const [free, pass] = await Promise.all([
        freeTopics([...new Set(guides.map((g) => g.table).filter(Boolean))]),
        hasPass(event),
      ]);
      const open = Object.fromEntries(guides.map((g) => [g.path, pass.ok || isFree(g, free)]));
      return json(200, { open }, { 'Cache-Control': 'private, no-store' });
    }

    const [guide] = await rows(
      `study_guides?subject=eq.${encodeURIComponent(subject)}&path=eq.${encodeURIComponent(path)}&select=topics,table:tb,html`,
    );
    if (!guide) return fail(404, 'This study guide is not on the site');
    if (isFree(guide, await freeTopics(guide.table ? [guide.table] : []))) return html(guide.html, 'private, max-age=300');

    const pass = await hasPass(event);
    if (pass.ok) return html(guide.html, 'private, no-store');
    if (!pass.signedIn) return json(401, { error: 'Sign in to read this guide', locked: true });
    return json(403, {
      error: pass.otherDevice
        ? 'Your pass is in use on another device, so this guide is not open here'
        : 'This guide comes with a pass',
      locked: true,
    });
  } catch (e) {
    return fail(500, 'The guide could not be loaded right now', e);
  }
};
