/* Netlify Function: record an app visit
   POST /api/visit   (Authorization: Bearer <token>)   no body

   Bumps today's counter for the verified caller (daily_visits, via the
   record_visit() database function). The client calls it once per browser
   tab session; the rate limit is only a backstop. */

const { SUPA_URL, dbHeaders, fail, verifyUser, allowRequest } = require('./_lib/common');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  if (!(await allowRequest(caller.id, 'visit', 30, 3600))) return fail(429, 'Too many requests');

  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/record_visit`, {
      method: 'POST',
      headers: { ...dbHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user: caller.id }),
    });
    if (!res.ok) return fail(502, 'Could not record', `${res.status} ${await res.text()}`);
    return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
  } catch (e) {
    return fail(500, 'Could not record', e);
  }
};
