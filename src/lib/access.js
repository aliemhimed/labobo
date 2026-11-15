/* Client for /api/access: the signed-in student's plan (free, trial or
   pass) and the one-time trial. The server decides everything; nothing here
   unlocks a lecture by itself (see netlify/functions/_lib/access.js). */
import { authHeader } from './supabaseClient.js';

/** What a pass costs and covers, shown wherever the app talks about it. */
export const PASS_PRICE = '15 lari';
export const FREE_LECTURES = 2;

async function call(init = {}) {
  const res = await fetch('/api/access', {
    ...init,
    headers: { ...(await authHeader()), ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const fetchAccess = (signal) => call({ signal });

export const startTrial = () => call({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'start_trial' }),
});

/** Emails a 6-digit code to a university address (for accounts signed in with Gmail). */
export const sendUniCode = (email) => call({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'send_uni_code', email }),
});

/** Confirms the code; resolves to the new plan (the trial becomes available). */
export const verifyUniCode = (code) => call({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'verify_uni_code', code }),
});

/** Moves the pass's slot for this kind of device (phone, or tablet/computer) to this device. */
export const switchDevice = () => call({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'switch_device' }),
});

/** True when the account has a pass or trial but this device may not use it. */
export const deviceBlocked = (access) => access?.device?.ok === false;

/* The subscribe dialog can be opened from anywhere (a locked lecture, the
   home page strip, the profile menu); SubscribeDialogHost listens for this. */
const OPEN_EVENT = 'labobo:open-subscribe';
export const openSubscribeDialog = () => window.dispatchEvent(new Event(OPEN_EVENT));
export function onOpenSubscribeDialog(cb) {
  window.addEventListener(OPEN_EVENT, cb);
  return () => window.removeEventListener(OPEN_EVENT, cb);
}

/** "14 November, 11:59 PM" in the student's own time zone. */
export function formatMoment(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString(undefined, { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
}

/** "14 November 2026" in the student's own time zone. */
export function formatDay(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
