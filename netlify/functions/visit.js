/* Netlify Function: record an app visit
   POST /api/visit   (Authorization: Bearer <token>)   body: { tz }  (optional)

   Bumps today's counter for the verified caller (daily_visits, via the
   record_visit() database function). "Today" is the student's own calendar
   day in `tz`, their IANA time zone; without a usable one it's the UTC day.
   The client calls it once per browser tab session; the rate limit is only a
   backstop. */

const { SUPA_URL, dbHeaders, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');

function zone(tz) {
  if (typeof tz !== 'string' || tz.length > 64 || !/^[A-Za-z]+(?:[/_+-][A-Za-z0-9]+)*$/.test(tz)) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

async function record(userId, tz) {
  return fetch(`${SUPA_URL}/rest/v1/rpc/record_visit`, {
    method: 'POST',
    headers: { ...dbHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(tz ? { p_user: userId, p_tz: tz } : { p_user: userId }),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  if (!(await allowRequest(caller.id, 'visit', 30, 3600))) return fail(429, 'Too many requests');

  try {
    const tz = zone(parseBody(event)?.tz);
    let res = await record(caller.id, tz);
    // A zone Node knows but Postgres doesn't: count it on the UTC day instead.
    if (!res.ok && tz) res = await record(caller.id, null);
    if (!res.ok) return fail(502, 'Could not record', `${res.status} ${await res.text()}`);
    return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
  } catch (e) {
    return fail(500, 'Could not record', e);
  }
};
