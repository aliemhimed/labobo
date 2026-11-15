/* Proving a university address for an account that signed in with another
   one (usually Gmail), so it can get the university trial.

   The student types their @eu.edu.ge address; we email a 6-digit code to it
   from contact@studywithlabobo.online; entering the code marks the address
   as theirs (`university_emails`). A verified address belongs to one account
   only, and the trial stays one per address (`trials` is keyed by email), so
   linking an address that already had its trial gives nothing new.

   Sending needs CONTACT_SMTP_PASSWORD in the environment (the mailbox's
   password; never logged). */

const crypto = require('crypto');
const { SUPA_URL, dbHeaders } = require('./common');

const DOMAIN = 'eu.edu.ge';
const CODE_MINUTES = 15;
const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[a-z0-9._%+-]{1,64}@eu\.edu\.ge$/;

async function db(path, init = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) {
    const err = new Error(`university_emails ${init.method || 'GET'}: ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const hash = (userId, code) => crypto.createHash('sha256').update(`${userId}:${code}`).digest('hex');

/** The caller's verified university address, or null. */
async function verifiedEmail(userId) {
  const rows = await db(`/university_emails?user_id=eq.${encodeURIComponent(userId)}&verified_at=not.is.null&select=email`);
  return rows[0]?.email || null;
}

/** The caller's row (pending or verified), or null. */
async function getRow(userId) {
  const rows = await db(`/university_emails?user_id=eq.${encodeURIComponent(userId)}&select=email,verified_at,code_expires_at,attempts,sent_at`);
  return rows[0] || null;
}

let transport = null;
function mailer() {
  if (!process.env.CONTACT_SMTP_PASSWORD) throw Object.assign(new Error('Email sending is not set up'), { status: 503 });
  if (!transport) {
    const nodemailer = require('nodemailer');
    transport = nodemailer.createTransport({
      host: 'mail.privateemail.com',
      port: 465,
      secure: true,
      auth: { user: 'contact@studywithlabobo.online', pass: process.env.CONTACT_SMTP_PASSWORD },
    });
  }
  return transport;
}

function message(email, code) {
  const text = `Your Studywith Labobo code is ${code}

Enter it on the site to confirm ${email} is your university address. It works for ${CODE_MINUTES} minutes.

If you did not ask for this, ignore this email.

Studywith Labobo
https://studywithlabobo.online`;
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0B1233;max-width:480px">
<p>Your Studywith Labobo code is</p>
<p style="font-size:32px;font-weight:800;letter-spacing:6px;margin:8px 0 16px">${code}</p>
<p>Enter it on the site to confirm <b>${email}</b> is your university address. It works for ${CODE_MINUTES} minutes.</p>
<p style="color:#46527F">If you did not ask for this, ignore this email.</p>
<p>Studywith Labobo<br><a href="https://studywithlabobo.online">studywithlabobo.online</a></p></div>`;
  return {
    from: '"Studywith Labobo" <contact@studywithlabobo.online>',
    to: email,
    subject: `${code} is your Labobo code`,
    text,
    html,
  };
}

/** Sends a new code. Throws an Error with .status and a message fit for students. */
async function sendCode(userId, rawEmail, send) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw Object.assign(new Error(`Enter your university address, ending in @${DOMAIN}`), { status: 400 });

  const deliver = send || ((m) => mailer().sendMail(m));
  if (!send) mailer();

  const taken = await db(`/university_emails?email=eq.${encodeURIComponent(email)}&verified_at=not.is.null&user_id=neq.${encodeURIComponent(userId)}&select=user_id`);
  if (taken.length) throw Object.assign(new Error('This address is already linked to another Labobo account'), { status: 409 });

  const row = await getRow(userId);
  if (row?.verified_at) {
    throw Object.assign(new Error(
      row.email === email ? 'This address is already confirmed' : 'Your account already has a confirmed university address',
    ), { status: 409 });
  }
  if (row?.sent_at && Date.now() - Date.parse(row.sent_at) < RESEND_SECONDS * 1000) {
    throw Object.assign(new Error('A code was just sent. Wait a minute before asking for another'), { status: 429 });
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();
  // One row per account: a new address replaces the old one until it is confirmed.
  await db('/university_emails?on_conflict=user_id', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId, email, verified_at: null, attempts: 0,
      code_hash: hash(userId, code),
      code_expires_at: new Date(now.getTime() + CODE_MINUTES * 60_000).toISOString(),
      sent_at: now.toISOString(),
    }),
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  });
  try {
    await deliver(message(email, code));
  } catch (e) {
    await db(`/university_emails?user_id=eq.${encodeURIComponent(userId)}&verified_at=is.null`, {
      method: 'PATCH',
      body: JSON.stringify({ code_hash: null, code_expires_at: null, sent_at: null }),
      headers: { Prefer: 'return=minimal' },
    }).catch(() => {});
    if (e.status === 503) throw e;
    console.error('[uni-email] send failed', e.code || e.message);
    throw Object.assign(new Error('The code could not be sent. Check the address and try again'), { status: 502 });
  }
  return { email };
}

/** Checks a code. Returns { email } when it is right. */
async function verifyCode(userId, rawCode) {
  const code = String(rawCode || '').replace(/\D/g, '');
  if (code.length !== 6) throw Object.assign(new Error('Enter the 6-digit code from the email'), { status: 400 });
  const rows = await db(`/university_emails?user_id=eq.${encodeURIComponent(userId)}&select=email,verified_at,code_hash,code_expires_at,attempts`);
  const row = rows[0];
  if (row?.verified_at) return { email: row.email };
  if (!row?.code_hash) throw Object.assign(new Error('Ask for a code first'), { status: 400 });
  if (Date.parse(row.code_expires_at) < Date.now()) throw Object.assign(new Error('This code has expired. Ask for a new one'), { status: 400 });
  if (row.attempts >= MAX_ATTEMPTS) throw Object.assign(new Error('Too many wrong codes. Ask for a new one'), { status: 429 });

  const stored = row.code_hash;
  const given = hash(userId, code);
  const right = stored.length === given.length && crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(given));
  if (!right) {
    await db(`/university_emails?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH', body: JSON.stringify({ attempts: row.attempts + 1 }), headers: { Prefer: 'return=minimal' },
    });
    throw Object.assign(new Error('That code is not right. Check the email and try again'), { status: 400 });
  }

  const email = row.email;
  try {
    await db(`/university_emails?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ email, verified_at: new Date().toISOString(), code_hash: null, code_expires_at: null, attempts: 0 }),
      headers: { Prefer: 'return=minimal' },
    });
  } catch (e) {
    // The unique index: someone else confirmed this address in the meantime.
    if (e.status === 409) throw Object.assign(new Error('This address is already linked to another Labobo account'), { status: 409 });
    throw e;
  }
  return { email };
}

module.exports = { DOMAIN, sendCode, verifyCode, verifiedEmail, getRow, mailer, message };
