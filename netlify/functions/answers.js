/* Netlify Function: record which option was picked for each question
   POST /api/answers   (Authorization: Bearer <token>)
     body: { items: [{ id: "<table>:<row id>", pick: <original option index> | null }] }

   Called once per finished practice set or exam (not for "review wrong
   answers", which only replays questions the student already missed and
   would skew the numbers). Feeds question_stats via record_answers(), which
   the admin dashboard uses to spot questions most students get wrong. The
   counts are anonymous: nothing about who answered is stored. */

const { SUPA_URL, dbHeaders, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');

const MAX_ITEMS = 250;
const QUESTION_ID = /^[a-z0-9_]{1,63}:\d{1,19}$/;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  const body = parseBody(event);
  if (!body || !Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    return fail(400, 'items must be a list of 1-250 answers');
  }
  const items = body.items
    .filter((x) => x && typeof x.id === 'string' && QUESTION_ID.test(x.id))
    .map((x) => ({ id: x.id, pick: Number.isInteger(x.pick) && x.pick >= 0 && x.pick <= 5 ? String(x.pick) : 'blank' }));
  if (!items.length) return fail(400, 'No valid answers');

  // Same budget as saving a session: one call per finished quiz.
  if (!(await allowRequest(caller.id, 'answers', 120, 3600))) return fail(429, 'Too many requests');

  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/record_answers`, {
      method: 'POST',
      headers: { ...dbHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_items: items }),
    });
    if (!res.ok) return fail(502, 'Could not record', `${res.status} ${await res.text()}`);
    return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
  } catch (e) {
    return fail(500, 'Could not record', e);
  }
};
