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
        signing up again does not give a second trial.
   POST /api/access  body: { action: 'switch_device' }
     -> the GET reply
        Moves the pass from the device in this device's slot (phone, or
        tablet/computer) to this one, at most once per slot every 30 days.
   With a pass or trial after the lock, the GET reply also has
     device: { ok, reason, slots, ... }   (see _lib/devices.js)
   POST /api/access  body: { action: 'send_uni_code', email }
     -> { sent: true, email }   emails a 6-digit code to a @eu.edu.ge address
   POST /api/access  body: { action: 'verify_uni_code', code }
     -> the GET reply           the address is now this account's, so a Gmail
                                account can take the university trial
        (see _lib/uniEmail.js) */

const { SUPA_URL, dbHeaders, json, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');
const { LOCK_START, TRIAL_DAYS, TRIAL_DOMAIN, isLocked, trialEmail, getAccess } = require('./_lib/access');
const { readDevice, switchToDevice } = require('./_lib/devices');
const { sendCode, verifyCode, getRow } = require('./_lib/uniEmail');

const DAY_MS = 86_400_000;

function describe(caller, access, pending = null) {
  const email = access.uni_email || trialEmail(caller);
  const eligible = !!email;
  return {
    locked: isLocked(),
    lock_start: LOCK_START.toISOString(),
    access: access.kind,
    expires_at: access.expires_at,
    device: access.device || null,
    trial: {
      days: TRIAL_DAYS,
      domain: TRIAL_DOMAIN,
      eligible,
      used: access.trial_used,
      available: isLocked() && eligible && !access.trial_used && access.kind === 'none',
      // The university address that counts for the trial, and whether it was
      // proved by a code (a Gmail account) rather than being the sign-in address.
      email: email || null,
      verified_by_code: !!access.uni_email && !trialEmail(caller),
      // An address waiting for its code.
      pending: !access.uni_email && pending && !pending.verified_at && pending.code_expires_at && Date.parse(pending.code_expires_at) > Date.now()
        ? pending.email : null,
    },
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  try {
    if (event.httpMethod === 'GET') {
      const [access, pending] = await Promise.all([getAccess(caller, event), trialEmail(caller) ? null : getRow(caller.id).catch(() => null)]);
      return json(200, describe(caller, access, pending), { 'Cache-Control': 'private, no-store' });
    }

    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      if (body?.action === 'switch_device') {
        if (!(await allowRequest(caller.id, 'switch_device', 5, 3600))) return fail(429, 'Too many requests');
        const plan = await getAccess(caller);
        if (!isLocked() || (plan.kind !== 'pass' && plan.kind !== 'trial')) return fail(400, 'Only a pass or trial is tied to devices');
        const result = await switchToDevice(caller.id, readDevice(event));
        if (result.reason === 'missing') return fail(400, 'Reload the page and try again');
        if (result.reason === 'switch_limit') {
          return fail(409, 'This slot was already moved in the last 30 days. Message us and we will move it for you.');
        }
        return json(200, describe(caller, await getAccess(caller, event)), { 'Cache-Control': 'private, no-store' });
      }
      if (body?.action === 'send_uni_code' || body?.action === 'verify_uni_code') {
        if (trialEmail(caller)) return fail(400, 'You are already signed in with your university address');
        const sending = body.action === 'send_uni_code';
        if (!(await allowRequest(caller.id, sending ? 'uni_code_send' : 'uni_code_check', sending ? 5 : 15, 3600))) {
          return fail(429, 'Too many tries. Wait a while and try again');
        }
        try {
          if (sending) return json(200, { sent: true, ...(await sendCode(caller.id, body.email)) });
          await verifyCode(caller.id, body.code);
          return json(200, describe(caller, await getAccess(caller, event)), { 'Cache-Control': 'private, no-store' });
        } catch (e) {
          if (e.status && e.status < 500) return fail(e.status, e.message);
          if (e.status === 502 || e.status === 503) return fail(e.status, e.message, e.message);
          throw e;
        }
      }
      if (body?.action !== 'start_trial') return fail(400, 'Unknown action');
      if (!isLocked()) return fail(400, 'Everything is still free, so there is nothing to try yet');

      if (!(await allowRequest(caller.id, 'trial', 5, 3600))) return fail(429, 'Too many requests');
      const access = await getAccess(caller);
      const email = trialEmail(caller) || access.uni_email;
      if (!email) return fail(403, `The free trial is for students with a confirmed @${TRIAL_DOMAIN} address`);

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
