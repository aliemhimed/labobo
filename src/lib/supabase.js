import { SUPA_URL, SUPA_KEY } from './supabaseConfig.js';
import { authHeader } from './supabaseClient.js';

export { SUPA_URL, SUPA_KEY };

export const SUPA_HEADERS = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
};

/* Writes go through our own domain: ad blockers (uBlock, AdGuard, Brave)
   block *.supabase.co outright, which silently dropped every insert.
   Every caller is signed in (the whole app sits behind AuthGate), so the
   current session's access token rides along — the function verifies it
   server-side and uses it as the row's identity; a client-supplied id in
   `data` would be ignored anyway (see netlify/functions/supa-insert.js). */
export async function supaInsert(table, data) {
  try {
    const res = await fetch('/api/supa-insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ table, data }),
    });
    if (!res.ok) console.error('[Supabase proxy]', table, res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('[Supabase network]', table, e);
    return false;
  }
}
