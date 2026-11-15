/* Who may read the paid lectures.

   Until LOCK_START everything is open, exactly as before subscriptions.
   From then on a student reads the whole bank only with a pass (a row in
   `subscriptions`, granted from the admin dashboard) or during the one-time
   trial (`trials`); everyone else gets the free lectures listed in
   `free_topics`. The database enforces the same rule for the publishable
   key (supabase/migrations/20261113041157_lock_paid_lectures.sql), so this
   file is the only way to the paid rows. */

const { SUPA_URL, dbHeaders } = require('./common');
const { readDevice, checkDevice } = require('./devices');
const { verifiedEmail } = require('./uniEmail');

// Subscriptions start at the end of 14 November 2026 in Tbilisi (UTC+4).
// LOCK_START in the environment overrides it, for testing the lock locally.
const LOCK_START = new Date(process.env.LOCK_START || '2026-11-14T19:59:00Z');

const TRIAL_DAYS = 3;
// The trial is for students who can prove a university address.
const TRIAL_DOMAIN = 'eu.edu.ge';

const isLocked = (now = new Date()) => now >= LOCK_START;

async function rows(path) {
  const res = await fetch(`${SUPA_URL}/rest/v1${path}`, { headers: dbHeaders() });
  if (!res.ok) throw new Error(`access ${path.split('?')[0]}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** The caller's confirmed university address in lower case, or null. */
function trialEmail(caller) {
  const email = (caller?.email || '').toLowerCase();
  return caller?.emailConfirmed && email.endsWith(`@${TRIAL_DOMAIN}`) ? email : null;
}

/** { kind, expires_at, trial_used } for a verified caller (or null).
    kind: 'pass'  paid, until expires_at (also reported before the lock, so
                  a student who pre-subscribed sees it and isn't asked to pay
                  again)
          'open'  subscriptions have not started, everyone reads everything
          'trial' inside the 3-day trial, until expires_at
          'none'  free lectures only
    Throws if the lookup fails: callers answer with an error rather than
    guess, so a database hiccup neither locks out a paying student for good
    nor opens the bank to everyone.

    With the request `event`, a pass or trial after the lock also checks the
    device (_lib/devices.js) and adds `device`: { ok, reason, slots, ... }.
    A device that is turned away keeps its kind ('pass', so the student is
    not asked to pay again) but hasFullAccess() is false for it. Without
    `event` (payments) the device is not checked. */
async function getAccess(caller, event) {
  const access = await getPlan(caller);
  if (event && caller && isLocked() && (access.kind === 'pass' || access.kind === 'trial')) {
    access.device = await checkDevice(caller.id, readDevice(event));
  }
  return access;
}

async function getPlan(caller) {
  if (!caller) return { kind: isLocked() ? 'none' : 'open', expires_at: null, trial_used: false };

  const id = encodeURIComponent(caller.id);
  // The sign-in address if it is a university one, else a university address
  // the student proved with an emailed code (_lib/uniEmail.js).
  const verified = trialEmail(caller) ? null : await verifiedEmail(caller.id).catch(() => null);
  const email = trialEmail(caller) || verified;
  const trialFilter = email
    ? `or=(user_id.eq.${id},email.eq.${encodeURIComponent(email)})`
    : `user_id=eq.${id}`;
  const [subs, trials] = await Promise.all([
    rows(`/subscriptions?user_id=eq.${id}&select=expires_at`),
    rows(`/trials?${trialFilter}&select=expires_at`),
  ]);

  const now = Date.now();
  const live = (list) => list.map((r) => r.expires_at).filter((t) => new Date(t).getTime() > now).sort().pop() || null;
  const pass = live(subs);
  if (pass) return { kind: 'pass', expires_at: pass, trial_used: trials.length > 0, uni_email: email };
  if (!isLocked()) return { kind: 'open', expires_at: null, trial_used: trials.length > 0, uni_email: email };
  const trial = live(trials);
  if (trial) return { kind: 'trial', expires_at: trial, trial_used: true, uni_email: email };
  return { kind: 'none', expires_at: null, trial_used: trials.length > 0, uni_email: email };
}

const hasFullAccess = (access) => access.kind === 'open'
  || ((access.kind === 'pass' || access.kind === 'trial') && access.device?.ok !== false);

module.exports = { LOCK_START, TRIAL_DAYS, TRIAL_DOMAIN, isLocked, trialEmail, getAccess, hasFullAccess };
