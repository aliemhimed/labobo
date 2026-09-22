import { createClient } from '@supabase/supabase-js';
import { SUPA_URL, SUPA_KEY } from './supabaseConfig.js';

/* The one place the Supabase JS SDK is created. Handles OAuth, email/password
   auth, session persistence (localStorage) and automatic token refresh —
   nothing here should be hand-rolled. Everything else that talks to Supabase
   directly (question counts, the offline question fallback) still uses the
   plain fetch helpers in supabase.js; this client is for auth and for the
   user's own `profiles` row, which RLS scopes to auth.uid() anyway. */
export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** { Authorization: 'Bearer <token>' } for the current session, or {} when
    signed out. Every write that needs a verified identity (supaInsert,
    the leaderboard) attaches this — the server never trusts a client-
    supplied id, only this token (see netlify/functions/_lib/common#verifyUser). */
export async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
