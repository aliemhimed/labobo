/* Netlify Function: study guides, with the same rule as the questions: the
   free lectures (free_topics) are open to everyone, the rest need a pass or
   trial on an allowed device. Unlike the questions, this applies right away,
   not only from LOCK_START.

   GET /api/guide?subject=gct&path=genetics/wk02-dominance-abo
       (Authorization: Bearer <token> when signed in)
     -> 200 text/html   the guide (an <article class="lb-guide"> fragment)
        401 / 403 JSON  { error, locked: true } when it needs a pass
   GET /api/guide?subject=gct&list=1
     -> { open: { "<path>": true | false } }   which guides this caller can read

   The guide text is bundled into this function (_lib/guides-content.json,
   written by study-guides/publish.cjs), not served as public files, so a
   locked guide cannot be read by guessing its address. The pictures stay
   public in /guides/img. */

const { SUPA_URL, anonHeaders, json, fail, verifyUser } = require('./_lib/common');
const { getAccess } = require('./_lib/access');
const { readDevice, checkDevice } = require('./_lib/devices');
const CONTENT = require('./_lib/guides-content.json');
const MANIFEST = require('../../src/lib/guides.json');

/** Set of "<table>::<topic>" that are free. */
async function freeTopics(tables) {
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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'GET') return fail(405, 'Method not allowed');
  const { subject = '', path = '', list } = event.queryStringParameters || {};
  const m = MANIFEST[subject];
  if (!m) return fail(404, 'No study guides for this subject');

  try {
    const free = await freeTopics([...new Set(m.guides.map((g) => g.table).filter(Boolean))]);

    if (list) {
      const pass = (await hasPass(event)).ok;
      const open = Object.fromEntries(m.guides.map((g) => [g.path, pass || isFree(g, free)]));
      return json(200, { open }, { 'Cache-Control': 'private, no-store' });
    }

    const guide = m.guides.find((g) => g.path === path);
    const body = guide && CONTENT[`${subject}/${path}`];
    if (!body) return fail(404, 'This study guide is not on the site');
    if (isFree(guide, free)) return html(body, 'private, max-age=300');

    const pass = await hasPass(event);
    if (pass.ok) return html(body, 'private, no-store');
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
