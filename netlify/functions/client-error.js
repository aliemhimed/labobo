/* Netlify Function: crash reports from the browser
   POST /api/client-error   body: { kind, message, stack, url, release }
        (Authorization: Bearer <token> optional; the user id is read from it)
     -> 204

   src/lib/errorReport.js sends uncaught errors, rejected promises and React
   render errors here. Each is trimmed, grouped by a fingerprint (message plus
   the first stack line) and stored in client_errors for the admin's Errors
   tab. Rate-limited per user (or per network when signed out) so a crash
   loop on one phone can't fill the table. */

const crypto = require('crypto');
const { SUPA_URL, dbHeaders, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');

const cut = (v, n) => (v == null ? null : String(v).slice(0, n));
const KINDS = new Set(['error', 'rejection', 'render']);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  const body = parseBody(event);
  const message = cut(body?.message, 500);
  if (!message) return fail(400, 'message is required');

  const caller = await verifyUser(event);
  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';
  const who = caller?.id || `ip:${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)}`;
  if (!(await allowRequest(who, 'client_error', 20, 3600))) return { statusCode: 204, body: '' };

  const stack = cut(body.stack, 4000);
  const firstFrame = (stack || '').split('\n').find((l) => /at |@/.test(l)) || '';
  const fingerprint = crypto.createHash('sha1')
    // Hashed bundle names change every deploy; leave them out of the grouping.
    .update(message.replace(/\d+/g, 'N') + '|' + firstFrame.replace(/-[A-Za-z0-9_]{8}\.js/g, '.js').replace(/:\d+:\d+/g, '').trim())
    .digest('hex').slice(0, 16);

  const res = await fetch(`${SUPA_URL}/rest/v1/client_errors`, {
    method: 'POST',
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: caller?.id || null,
      kind: KINDS.has(body.kind) ? body.kind : 'error',
      message,
      stack,
      url: cut(body.url, 300),
      user_agent: cut(event.headers['user-agent'], 300),
      release: cut(body.release, 40),
      fingerprint,
    }),
  });
  if (!res.ok) return fail(502, 'Could not save the report', `${res.status} ${await res.text()}`);
  return { statusCode: 204, body: '' };
};
