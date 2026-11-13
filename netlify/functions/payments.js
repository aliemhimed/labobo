/* Netlify Function: paying for a pass by bank transfer
   GET  /api/payments                         (Authorization: Bearer <token>)
     -> { reference, accounts: [{ bank, holder, iban }],
          request: { status, created_at, decided_at, note } | null }
        `reference` is what this student writes in their bank transfer; it
        is derived from their account, so it is the same every time.
        `accounts` is where to send the money (the payment_accounts table).
        `request` is their latest receipt and what happened to it.
   POST /api/payments   body: { type, data }   (Authorization: Bearer <token>)
     -> the same shape, with the new request
        Uploads a receipt (`data` is base64; a JPEG, PNG or WebP image or a
        PDF, up to 4 MB) and puts it in the queue an admin works through in
        the dashboard. A student has one receipt waiting at a time: sending
        another replaces it.

   Receipts show names and account numbers, so they go to a private storage
   bucket that only the admin function reads, through short-lived links. */

const crypto = require('crypto');
const { SUPA_URL, dbHeaders, json, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');
const { getAccess } = require('./_lib/access');

const BUCKET = 'receipts';
const MAX_BYTES = 4 * 1024 * 1024;

// Allowed types, each with the bytes a real file of that type starts with.
const TYPES = {
  'image/jpeg': { ext: 'jpg', is: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', is: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: 'webp', is: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  'application/pdf': { ext: 'pdf', is: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
};

/* "LB-7K2QXM": short enough to type into a banking app, with no letters or
   digits that look alike. Derived from the account id so a student sees the
   same reference on every visit and device. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function referenceFor(userId) {
  const hash = crypto.createHash('sha256').update(`labobo-pay:${userId}`).digest();
  let code = '';
  for (let i = 0; i < 6; i += 1) code += ALPHABET[hash[i] % ALPHABET.length];
  return `LB-${code}`;
}

const rest = (path, init = {}) =>
  fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

const publicRequest = (r) => (r ? { status: r.status, created_at: r.created_at, decided_at: r.decided_at, note: r.note } : null);

async function latestRequest(userId) {
  const res = await rest(`/payment_requests?user_id=eq.${encodeURIComponent(userId)}&select=id,status,created_at,decided_at,note,receipt_path&order=created_at.desc&limit=1`);
  if (!res.ok) throw new Error(`payment_requests ${res.status} ${await res.text()}`);
  return (await res.json())[0] || null;
}

/* Where to send the money. A failed lookup gives an empty list, and the app
   then asks the student to message us for the details. */
async function activeAccounts() {
  try {
    const res = await rest('/payment_accounts?active=eq.true&select=bank,holder,iban&order=position.asc,id.asc');
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return await res.json();
  } catch (e) {
    console.error('[payments] accounts', e);
    return [];
  }
}

async function removeFile(path) {
  try {
    await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${path}`, { method: 'DELETE', headers: dbHeaders() });
  } catch (e) {
    console.error('[payments] could not remove', path, e);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };

  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  try {
    const reference = referenceFor(caller.id);

    if (event.httpMethod === 'GET') {
      const [accounts, request] = await Promise.all([activeAccounts(), latestRequest(caller.id)]);
      return json(200, { reference, accounts, request: publicRequest(request) }, { 'Cache-Control': 'private, no-store' });
    }

    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      const kind = body && Object.prototype.hasOwnProperty.call(TYPES, body.type) ? TYPES[body.type] : null;
      if (!kind || typeof body.data !== 'string') return fail(400, 'Send a photo or screenshot (JPEG, PNG, WebP) or a PDF');
      // Reject oversized uploads before decoding them.
      if (body.data.length > MAX_BYTES * 1.4) return fail(413, 'That file is too large. Keep it under 4 MB.');
      const file = Buffer.from(body.data, 'base64');
      if (!file.length || file.length > MAX_BYTES) return fail(413, 'That file is too large. Keep it under 4 MB.');
      if (!kind.is(file)) return fail(400, "That file doesn't look like a photo or a PDF. Try a screenshot of the receipt.");

      const access = await getAccess(caller);
      if (access.kind === 'pass') return fail(400, 'Your pass is already switched on');
      if (!(await allowRequest(caller.id, 'receipt', 6, 3600))) {
        return fail(429, 'You have sent several receipts in the last hour. Please wait, or message us.');
      }

      const path = `${caller.id}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${kind.ext}`;
      const up = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { ...dbHeaders(), 'Content-Type': body.type },
        body: file,
      });
      if (!up.ok) return fail(502, 'Could not save the receipt', `upload ${up.status} ${await up.text()}`);

      // A receipt already waiting is replaced, not queued twice.
      const waiting = await latestRequest(caller.id);
      let res;
      if (waiting?.status === 'pending') {
        res = await rest(`/payment_requests?id=eq.${waiting.id}&status=eq.pending`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ receipt_path: path, reference, created_at: new Date().toISOString() }),
        });
      } else {
        res = await rest('/payment_requests', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ user_id: caller.id, reference, receipt_path: path }),
        });
      }
      const saved = res.ok ? (await res.json())[0] : null;
      if (!saved) {
        await removeFile(path);
        return fail(502, 'Could not save the receipt', `row ${res.status} ${res.ok ? 'no row' : await res.text()}`);
      }
      if (waiting?.status === 'pending' && waiting.receipt_path !== path) await removeFile(waiting.receipt_path);
      return json(200, { reference, accounts: await activeAccounts(), request: publicRequest(saved) });
    }

    return fail(405, 'Method not allowed');
  } catch (e) {
    return fail(500, 'Payments are unavailable right now', e);
  }
};

exports.referenceFor = referenceFor;
