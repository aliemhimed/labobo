import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

/* Auth state is a live subscription, not a one-shot fetch, so it's a plain
   context rather than a React Query hook — everything downstream (AuthGate,
   the profile query, the leaderboard/session functions) reads the session
   from here. */
const AuthContext = createContext({ session: null, user: null, loading: true });

export function AuthProvider({ children }) {
  const [state, setState] = useState({ session: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setState({ session: data.session, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = { session: state.session, user: state.session?.user ?? null, loading: state.loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/* redirectTo must be an allowed Redirect URL in Supabase Auth settings.
   Sending people back to the site root and letting the router take it from
   there (rather than the exact page they started on) keeps that list short. */
const redirectTo = () => window.location.origin;

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
}

export function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUpWithPassword(email, password) {
  return supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
}

export function signOut() {
  return supabase.auth.signOut();
}
