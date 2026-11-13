/* Netlify Function: a student's plan
   GET  /api/access                       (Authorization: Bearer <token>)
     -> { locked, lock_start, access, expires_at,
          trial: { days, domain, eligible, used, available } }
        access: 'open' | 'pass' | 'trial' | 'none'   (see _lib/access.js)
   POST /api/access  body: { action: 'start_trial' }
     -> { access: 'trial', expires_at }
        Starts the one-time 3-day trial. Only for an account whose confirmed
        sign-in address is at the university domain, and only once per
        address: the address is the row's key, so deleting the account and
        signing up again does not give a second trial. */

const { SUPA_URL, dbHeaders, json, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');
const { LOCK_START, TRIAL_DAYS, TRIAL_DOMAIN, isLocked, trialEmail, getAccess } = require('./_lib/access');

const DAY_MS = 86_400_000;

function describe(caller, access) {
  const eligible = !!trialEmail(caller);
  return {
    locked: isLocked(),
    lock_start: LOCK_START.toISOString(),
    access: access.kind,
    expires_at: access.expires_at,
    trial: {
      days: TRIAL_DAYS,
      domain: TRIAL_DOMAIN,
      eligible,
      used: access.trial_used,
      available: isLocked() && eligible && !access.trial_used && access.kind === 'none',
    },
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  try {
    if (event.httpMethod === 'GET') {
      return json(200, describe(caller, await getAccess(caller)), { 'Cache-Control': 'private, no-store' });
    }

    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      if (body?.action !== 'start_trial') return fail(400, 'Unknown action');
      if (!isLocked()) return fail(400, 'Everything is still free, so there is nothing to try yet');

      const email = trialEmail(caller);
      if (!email) return fail(403, `The free trial is for accounts signed in with a @${TRIAL_DOMAIN} address`);
      if (!(await allowRequest(caller.id, 'trial', 5, 3600))) return fail(429, 'Too many requests');

      const access = await getAccess(caller);
      if (access.kind === 'pass') return fail(400, 'You already have full access');
      if (access.trial_used) return fail(409, 'This university address has already used its free trial');

      const expires = new Date(Date.now() + TRIAL_DAYS * DAY_MS).toISOString();
      const res = await fetch(`${SUPA_URL}/rest/v1/trials`, {
        method: 'POST',
        headers: { ...dbHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ email, user_id: caller.id, expires_at: expires }),
      });
      // The address is the primary key: a second attempt, even from a new
      // account or a parallel request, lands here.
      if (res.status === 409) return fail(409, 'This university address has already used its free trial');
      if (!res.ok) return fail(502, 'Could not start the trial', `${res.status} ${await res.text()}`);
      return json(200, { access: 'trial', expires_at: expires });
    }

    return fail(405, 'Method not allowed');
  } catch (e) {
    return fail(500, 'Your plan could not be checked right now', e);
  }
};
