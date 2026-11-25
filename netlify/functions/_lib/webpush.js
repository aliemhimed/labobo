/* Minimal Web Push sender, without a library.

   The reminder carries no payload: the service worker shows its own text
   when the push arrives (public/sw.js). A push with no body needs no
   encryption, only a VAPID token: a JWT signed with the server's P-256 key
   that tells the push service (Google, Mozilla, Apple) who is sending.

   Keys come from the environment:
     VAPID_PUBLIC_KEY   base64url, the 65-byte uncompressed public point
     VAPID_PRIVATE_KEY  base64url, the 32-byte private scalar
     VAPID_SUBJECT      mailto: or https: contact for the push services
   Make a pair with `node scripts/vapid-keys.cjs`. */

const crypto = require('crypto');

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function privateKey() {
  const pub = Buffer.from(process.env.VAPID_PUBLIC_KEY || '', 'base64url');
  const d = process.env.VAPID_PRIVATE_KEY || '';
  if (pub.length !== 65 || !d) throw new Error('VAPID keys are not set');
  return crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d, x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
    format: 'jwk',
  });
}

function vapidToken(endpoint, key) {
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64url(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: process.env.VAPID_SUBJECT || 'mailto:hello@studywithlabobo.online',
  }));
  const sig = crypto.sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${header}.${claims}.${b64url(sig)}`;
}

const isConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/** Sends an empty push. Resolves to the HTTP status; 404/410 mean the
    subscription is gone and should be deleted. */
async function sendEmptyPush(endpoint, key = privateKey()) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${vapidToken(endpoint, key)}, k=${process.env.VAPID_PUBLIC_KEY}`,
      TTL: String(6 * 3600),
      Urgency: 'normal',
      'Content-Length': '0',
    },
  });
  return res.status;
}

module.exports = { isConfigured, privateKey, sendEmptyPush };
