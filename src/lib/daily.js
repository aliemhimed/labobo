/* Client for POST /api/daily: draws the free plan's daily set from the
   locked lectures. The server decides what may be drawn and keeps the set,
   so this cannot hand out more than one practice set and one exam a day
   (see netlify/functions/daily.js). Today's sets are read along with the
   bank, in src/lib/questions.js. */
import { authHeader } from './supabaseClient.js';

/** Questions in a daily set. */
export const DAILY_SET_SIZE = 30;

/** { subject, mode, scope, topics: [{ table, topic }], plan: { table: n } }
    -> { day, resets_at, set: { scope, ids, rows } }. Throws an Error with
    the server's message and `status` (409: already used today). */
export async function drawDailySet(request) {
  const res = await fetch('/api/daily', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(request),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
