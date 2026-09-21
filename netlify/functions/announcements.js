/* Netlify Function: announcements — public read endpoint for site-wide notices.

   GET /api/announcements
     -> [{ id, title, body, pub_date }, ...]   newest first

   Returns a bare array because that is what src/components/AnnouncementBanner.jsx
   expects (`const items = await res.json(); if (Array.isArray(items))`).

   Only active rows are returned; `active = false` hides an announcement
   without deleting it. Writes go through /api/admin, which uses the
   service_role key — this endpoint is read-only and uses the publishable
   key, whose RLS policy already restricts it to active rows. */

const { SUPA_URL, anonHeaders, json, fail } = require('./_lib/common');

// Public, read-only data: any origin may fetch it.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return { ...fail(405, 'Method not allowed'), headers: CORS };

  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/announcements` +
        `?select=id,title,body,pub_date&active=eq.true&order=pub_date.desc,created_at.desc`,
      { headers: anonHeaders() }
    );
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const rows = await res.json();

    return json(200, Array.isArray(rows) ? rows : [], {
      ...CORS,
      // The client also caches these for 5 minutes in localStorage.
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
    });
  } catch (e) {
    // The client falls back to its cache on a non-200.
    return { ...fail(502, 'Announcements are unavailable right now', e), headers: CORS };
  }
};
