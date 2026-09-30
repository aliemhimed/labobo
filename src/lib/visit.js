/* Tells the server "this signed-in user opened the app", once per browser
   tab session, so the admin dashboard can chart daily visits. Fire and
   forget: a failure must never affect the app. */
import { authHeader } from './supabaseClient.js';

const FLAG = 'labobo:visit-sent';

export async function recordVisit() {
  try {
    if (sessionStorage.getItem(FLAG)) return;
    sessionStorage.setItem(FLAG, '1');
  } catch {
    /* storage blocked: fall through and count this load */
  }
  try {
    // The student's own time zone, so the visit lands on their calendar day.
    let tz = null;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { /* old browser */ }
    await fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ tz }),
    });
  } catch {
    /* offline or functions not running */
  }
}
