/* Netlify Function: announcements shown to students
   GET /api/announcements -> { items: [{ id, message, tone, semester }] }

   The banners that are live right now (posted from the admin dashboard,
   see admin.js). `semester` null means everyone; the app filters by the
   student's semester. Nothing private in here, so no sign-in is needed and
   the CDN may hold it for a minute. */

const { SUPA_URL, dbHeaders, json, fail } = require('./_lib/common');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'GET') return fail(405, 'Method not allowed');

  try {
    const now = new Date().toISOString();
    const res = await fetch(
      `${SUPA_URL}/rest/v1/announcements?select=id,message,tone,semester`
        + `&starts_at=lte.${now}&or=(ends_at.is.null,ends_at.gt.${now})&order=created_at.desc&limit=5`,
      { headers: dbHeaders() }
    );
    if (!res.ok) return fail(502, 'Could not load announcements', `${res.status} ${await res.text()}`);
    return json(200, { items: await res.json() }, { 'Cache-Control': 'public, max-age=60, s-maxage=60' });
  } catch (e) {
    return fail(500, 'Could not load announcements', e);
  }
};
