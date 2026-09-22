import { useState } from 'react';
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from '../lib/auth.jsx';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
);

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

  async function google() {
    setError('');
    setBusy(true);
    const { error: err } = await signInWithGoogle();
    // A successful call navigates away to Google immediately; only a setup
    // problem (provider disabled, bad redirect URL) reports back here.
    if (err) { setError(err.message); setBusy(false); }
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
    if (err) { setError(err.message); return; }
    if (mode === 'signup') setNotice('Check your email to confirm your account, then sign in.');
  }

  return (
    <div className="container center-wrap">
      <div className="card" style={{ padding: 28, textAlign: 'center' }}>
        <img src="/theme/mascot.webp" alt="" width="72" height="72" style={{ margin: '0 auto 12px' }} />
        <h1 style={{ marginBottom: 4 }}>Studywith Labobo</h1>
        <p style={{ color: 'var(--text-soft)', marginBottom: 20 }}>Sign in to continue</p>

        <button type="button" className="btn primary lg" style={{ width: '100%', gap: 10 }}
                disabled={busy} onClick={google}>
          <GoogleIcon /> Continue with Google
        </button>

        {!showEmail ? (
          <button type="button" className="btn ghost" style={{ width: '100%', marginTop: 10 }}
                  onClick={() => setShowEmail(true)}>
            Sign up / Log in with email
          </button>
        ) : (
          <form onSubmit={submitEmail} style={{ marginTop: 16, textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button type="button" className={'btn' + (mode === 'signin' ? ' primary' : '')}
                      style={{ flex: 1 }} onClick={() => setMode('signin')}>Log in</button>
              <button type="button" className={'btn' + (mode === 'signup' ? ' primary' : '')}
                      style={{ flex: 1 }} onClick={() => setMode('signup')}>Sign up</button>
            </div>
            <label htmlFor="login-email" className="sr-only">Email</label>
            <input id="login-email" type="email" placeholder="you@example.com" autoComplete="email"
                   value={email} onChange={(e) => setEmail(e.target.value)}
                   style={{ marginBottom: 10 }} required />
            <label htmlFor="login-password" className="sr-only">Password</label>
            <input id="login-password" type="password" placeholder="Password"
                   autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                   value={password} onChange={(e) => setPassword(e.target.value)}
                   minLength={6} style={{ marginBottom: 12 }} required />
            <button type="submit" className="btn primary" style={{ width: '100%' }} disabled={busy}>
              {mode === 'signup' ? 'Create account' : 'Log in'}
            </button>
          </form>
        )}

        <div role="alert" style={{ color: 'var(--wrong)', fontSize: 13, marginTop: 14, minHeight: 16 }}>
          {error}
        </div>
        {notice ? (
          <div role="status" style={{ color: 'var(--correct)', fontSize: 13, marginTop: -8 }}>{notice}</div>
        ) : null}
      </div>
    </div>
  );
}
