/* Netlify Function: student reviews
   GET  /api/reviews                 -> { items: [{ id, name, rating, body, updated_at }] }
        the approved reviews, newest first. Public, cached for a minute.
   GET  /api/reviews?mine=1          (Authorization: Bearer <token>)
        -> { review: { rating, body, status, updated_at } | null }
   POST /api/reviews   body: { rating, body }   (Authorization: Bearer <token>)
        -> { review }   saves the caller's one review, replacing any earlier
           one, and sends it back to 'pending' until an admin approves it.

   The name shown is the first word of the student's profile name, read on
   the server; nothing in the request decides whose review it is. */

const { SUPA_URL, dbHeaders, json, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');
const { containsProfanity } = require('./_lib/profanity');

const MAX_BODY = 400;

const rest = (path, init = {}) =>
  fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

async function displayName(userId) {
  const res = await rest(`/profiles?id=eq.${encodeURIComponent(userId)}&select=username`);
  const [row] = res.ok ? await res.json() : [];
  const first = String(row?.username || '').trim().split(/\s+/)[0] || '';
  // An email used as a username would leak it; fall back to a neutral name.
  return first && !first.includes('@') ? first.slice(0, 40) : 'A student';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };

  try {
    if (event.httpMethod === 'GET' && !event.queryStringParameters?.mine) {
      const res = await rest('/reviews?status=eq.approved&select=id,name,rating,body,updated_at&order=updated_at.desc&limit=30');
      if (!res.ok) return fail(502, 'Could not load reviews', `${res.status} ${await res.text()}`);
      return json(200, { items: await res.json() }, { 'Cache-Control': 'public, max-age=60, s-maxage=60' });
    }

    const caller = await verifyUser(event);
    if (!caller) return fail(401, 'Sign in required');

    if (event.httpMethod === 'GET') {
      const res = await rest(`/reviews?user_id=eq.${encodeURIComponent(caller.id)}&select=rating,body,status,updated_at`);
      if (!res.ok) return fail(502, 'Could not load your review', `${res.status} ${await res.text()}`);
      const [review] = await res.json();
      return json(200, { review: review || null }, { 'Cache-Control': 'private, no-store' });
    }

    if (event.httpMethod === 'POST') {
      const input = parseBody(event);
      if (!input) return fail(400, 'Body must be a JSON object');
      const rating = Number(input.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail(400, 'Pick between 1 and 5 stars');
      const body = typeof input.body === 'string' ? input.body.trim().replace(/\n{3,}/g, '\n\n') : '';
      if (!body) return fail(400, 'Write a few words about the site');
      if (body.length > MAX_BODY) return fail(400, `Keep it under ${MAX_BODY} characters`);
      if (containsProfanity(body)) return fail(400, 'Please keep it friendly, without bad language');

      if (!(await allowRequest(caller.id, 'review', 5, 3600))) {
        return fail(429, 'You have edited your review a lot in the last hour. Try again later.');
      }

      const now = new Date().toISOString();
      const res = await rest('/reviews?on_conflict=user_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          user_id: caller.id, name: await displayName(caller.id), rating, body,
          status: 'pending', updated_at: now, decided_at: null, decided_by: null,
        }),
      });
      if (!res.ok) return fail(502, 'Could not save your review', `${res.status} ${await res.text()}`);
      const [row] = await res.json();
      return json(200, { review: { rating: row.rating, body: row.body, status: row.status, updated_at: row.updated_at } });
    }

    return fail(405, 'Method not allowed');
  } catch (e) {
    return fail(500, 'Reviews are unavailable right now', e);
  }
};
