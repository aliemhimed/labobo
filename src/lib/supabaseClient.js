import { AuthClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import { SUPA_URL, SUPA_KEY } from './supabaseConfig.js';

/* The one place the Supabase SDK is created. Handles OAuth, email/password
   auth, session persistence (localStorage) and automatic token refresh —
   nothing here should be hand-rolled. Everything else that talks to Supabase
   directly (question counts, the offline question fallback) still uses the
   plain fetch helpers in supabase.js; this client is for auth and for the
   user's own `profiles` row, which RLS scopes to auth.uid() anyway.

   Built from @supabase/auth-js + @supabase/postgrest-js rather than the full
   @supabase/supabase-js bundle, which also ships Storage, Realtime and
   Functions clients this app never uses. The options below mirror what
   supabase-js's createClient() would set — in particular the storageKey,
   so sessions saved by the old client are picked up unchanged. */
const STORAGE_KEY = `sb-${new URL(SUPA_URL).hostname.split('.')[0]}-auth-token`;

const auth = new AuthClient({
  url: `${SUPA_URL}/auth/v1`,
  headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
  storageKey: STORAGE_KEY,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
});

async function sessionToken() {
  const { data } = await auth.getSession();
  return data.session?.access_token ?? null;
}

/* PostgREST requests carry the user's JWT (falling back to the anon key when
   signed out) so RLS sees auth.uid(), same as supabase-js's fetchWithAuth. */
async function fetchWithAuth(input, init) {
  const headers = new Headers(init?.headers);
  if (!headers.has('apikey')) headers.set('apikey', SUPA_KEY);
  if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${(await sessionToken()) ?? SUPA_KEY}`);
  return fetch(input, { ...init, headers });
}

const rest = new PostgrestClient(`${SUPA_URL}/rest/v1`, { fetch: fetchWithAuth });

export const supabase = {
  auth,
  from: (table) => rest.from(table),
};

/** { Authorization: 'Bearer <token>' } for the current session, or {} when
    signed out. Every write that needs a verified identity (supaInsert,
    the leaderboard) attaches this — the server never trusts a client-
    supplied id, only this token (see netlify/functions/_lib/common#verifyUser). */
export async function authHeader() {
  const token = await sessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
