export const SUPA_URL = 'https://boukmowybmtfqkinuvqj.supabase.co';
export const SUPA_KEY = 'sb_publishable_LLpEKdQRvePMYJ5b7loUKA_SeZ51lJs';

export const SUPA_HEADERS = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
};

/* Writes go through our own domain: ad blockers (uBlock, AdGuard, Brave)
   block *.supabase.co outright, which silently dropped every insert. */
export async function supaInsert(table, data) {
  try {
    const res = await fetch('/api/supa-insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, data }),
    });
    if (!res.ok) console.error('[Supabase proxy]', table, res.status, await res.text());
  } catch (e) {
    console.error('[Supabase network]', table, e);
  }
}
