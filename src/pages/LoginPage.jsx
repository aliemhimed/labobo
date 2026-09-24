import { useEffect, useState } from 'react';
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from '../lib/auth.jsx';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
);

/* Supabase's raw error text is written for a developer, not a student
   (e.g. "AuthApiError: Email rate limit exceeded"). This maps the cases
   worth explaining differently; anything else falls back to err.message. */
function friendlyAuthError(err, mode) {
  const status = err.status ?? err.code;
  const msg = err.message || '';
  if (status === 429 || /rate limit/i.test(msg)) {
    return mode === 'signup'
      ? "Too many sign-up attempts right now. Please wait a few minutes, or use Continue with Google instead — it doesn't send an email."
      : 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.';
  if (/already registered/i.test(msg)) return 'An account already exists for that email — try Log in instead.';
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first — check your inbox for the confirmation link.';
  return msg || 'Something went wrong. Please try again.';
}

/* The only way into the app: everyone signs in (Google or email/password)
   before reaching any subject content. AuthGate renders this whenever there
   is no session. */
export default function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => { document.title = 'Sign in — Studywith Labobo'; }, []);

  async function google() {
    setError('');
    setBusy(true);
    const { error: err } = await signInWithGoogle();
    // A successful call navigates away to Google immediately; only a setup
    // problem (provider disabled, bad redirect URL) reports back here.
    if (err) { setError(friendlyAuthError(err, 'signin')); setBusy(false); }
  }

  async function submitEmail(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const { error: err } = mode === 'signup'
      ? await signUpWithPassword(email, password)
      : await signInWithPassword(email, password);
    setBusy(false);
    if (err) { setError(friendlyAuthError(err, mode)); return; }
    if (mode === 'signup') setNotice('Check your email to confirm your account, then sign in.');
  }

  return (
    <main className="login">
      <div className="login-panel">
        <img className="login-mascot" src="/theme/mascot.webp" alt="" width="80" height="120" />
        <p className="wordmark login-wordmark">Studywith Labobo</p>
        <h1>Practice questions for first-year medicine.</h1>
        <p className="lede">
          Study a topic with the answers in view, work through practice sets with feedback on
          every question, or sit a full exam and review what you missed.
        </p>

        <div className="login-actions">
          <button type="button" className="btn lg block" disabled={busy} onClick={google}>
            <GoogleIcon /> Continue with Google
          </button>

          {!showEmail ? (
            <button type="button" className="btn ghost block" onClick={() => setShowEmail(true)}>
              Use email instead
            </button>
          ) : (
            <form className="login-form" onSubmit={submitEmail}>
              <div className="segmented" role="group" aria-label="Log in or create an account">
                <button type="button" aria-pressed={mode === 'signin'} onClick={() => setMode('signin')}>
                  Log in
                </button>
                <button type="button" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>
                  Create account
                </button>
              </div>
              <div className="field">
                <label htmlFor="login-email" className="field-label">Email</label>
                <input id="login-email" type="email" placeholder="you@example.com" autoComplete="email"
                       value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="login-password" className="field-label">Password</label>
                <input id="login-password" type="password"
                       placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
                       autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                       value={password} onChange={(e) => setPassword(e.target.value)}
                       minLength={6} required />
              </div>
              <button type="submit" className="btn primary block" disabled={busy}>
                {mode === 'signup' ? 'Create account' : 'Log in'}
              </button>
            </form>
          )}
        </div>

        <p className="form-error" role="alert">{error}</p>
        {notice ? <p className="form-notice" role="status">{notice}</p> : null}
      </div>
    </main>
  );
}
