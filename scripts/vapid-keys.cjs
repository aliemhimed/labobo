/* Makes a VAPID key pair for the daily study reminder (web push).
   Run once:  node scripts/vapid-keys.cjs
   Then add the three lines it prints to the Netlify site's environment
   variables (Site configuration → Environment variables) and to .env for
   `netlify dev`. Keep VAPID_PRIVATE_KEY secret. Changing the pair later
   means every student has to turn reminders on again. */
const crypto = require('crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const pub = publicKey.export({ format: 'jwk' });
const priv = privateKey.export({ format: 'jwk' });
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]);

console.log(`VAPID_PUBLIC_KEY=${raw.toString('base64url')}`);
console.log(`VAPID_PRIVATE_KEY=${priv.d}`);
console.log('VAPID_SUBJECT=mailto:you@example.com   <- your contact address');
