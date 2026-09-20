/* Netlify Function: announcements — public read endpoint for site-wide notices.

   GET /api/announcements
     -> [{ id, title, body, pub_date }, ...]   newest first

   Returns a bare array because that is what src/legacy/announcements.js
   expects (`const items = await res.json(); if (Array.isArray(items))`).

   Only active rows are returned; `active = false` hides an announcement
   without deleting it. Writes go through /api/admin, which uses the
   service_role key — this endpoint is read-only and uses the publishable
   key, whose RLS policy already restricts it to active rows. */

const SUPA_URL = 'https://boukmowybmtfqkinuvqj.supabase.co';
const SUPA_KEY = 'sb_publishable_LLpEKdQRvePMYJ5b7loUKA_SeZ51lJs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  }

  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/announcements` +
        `?select=id,title,body,pub_date&active=eq.true&order=pub_date.desc,created_at.desc`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const rows = await res.json();

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        // The client also caches these for 5 minutes in localStorage.
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      },
      body: JSON.stringify(Array.isArray(rows) ? rows : []),
    };
  } catch (e) {
    // The client falls back to its cache on a non-200, so failing here is
    // survivable — but say why in the body for anyone reading the network tab.
    return {
      statusCode: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(e.message || e) }),
    };
  }
};
