/* Netlify Function: daily study reminder subscriptions
   GET    /api/push                    -> { publicKey } | 503 when not set up
   POST   /api/push   body: { subscription, hour, tz }   (Authorization: Bearer <token>)
          saves (or moves) this browser's push subscription to the caller,
          with the local hour they want the reminder at.
   DELETE /api/push   body: { endpoint }                 (Authorization: Bearer <token>)
          turns the reminder off on this browser.

   The reminder itself is sent by push-reminders.js. */

const { SUPA_URL, dbHeaders, json, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');
const { isConfigured } = require('./_lib/webpush');

const rest = (path, init = {}) =>
  fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

// Only the push services browsers actually use.
const PUSH_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|mozilla\.com|mozaws\.net|push\.apple\.com|notify\.windows\.com)\//;

function validZone(tz) {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod === 'GET') {
    if (!isConfigured()) return fail(503, 'Reminders are not set up yet');
    return json(200, { publicKey: process.env.VAPID_PUBLIC_KEY }, { 'Cache-Control': 'public, max-age=3600' });
  }

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in first');
  if (!(await allowRequest(caller.id, 'push', 20, 3600))) return fail(429, 'Too many requests, try again later');
  const body = parseBody(event) || {};

  try {
    if (event.httpMethod === 'POST') {
      const sub = body.subscription || {};
      const endpoint = String(sub.endpoint || '');
      if (!PUSH_HOSTS.test(endpoint) || endpoint.length > 1000) return fail(400, 'Unsupported push subscription');
      const hour = Number.isInteger(body.hour) && body.hour >= 0 && body.hour <= 23 ? body.hour : 19;
      const tz = typeof body.tz === 'string' && validZone(body.tz) ? body.tz : 'Asia/Tbilisi';
      const res = await rest('/push_subscriptions?on_conflict=endpoint', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          endpoint,
          user_id: caller.id,
          p256dh: String(sub.keys?.p256dh || '').slice(0, 200) || null,
          auth: String(sub.keys?.auth || '').slice(0, 100) || null,
          remind_hour: hour,
          tz,
          failures: 0,
        }),
      });
      if (!res.ok) return fail(502, 'Could not save the reminder', `${res.status} ${await res.text()}`);
      return json(200, { ok: true, hour });
    }

    if (event.httpMethod === 'DELETE') {
      const endpoint = String(body.endpoint || '');
      if (!endpoint) return fail(400, 'endpoint is required');
      const res = await rest(`/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&user_id=eq.${caller.id}`, { method: 'DELETE' });
      if (!res.ok) return fail(502, 'Could not turn the reminder off', `${res.status} ${await res.text()}`);
      return json(200, { ok: true });
    }

    return fail(405, 'Method not allowed');
  } catch (e) {
    return fail(500, 'Something went wrong', e);
  }
};
