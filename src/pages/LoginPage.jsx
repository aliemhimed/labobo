import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from '../lib/auth.jsx';
import { fetchTableCounts } from '../lib/questions.js';
import { fetchApprovedReviews } from '../lib/reviews.js';
import { ALL_QUESTION_TABLES, SUBJECTS, inSemester } from '../lib/subjects.js';
import { FREE_LECTURES, PASS_PRICE } from '../lib/access.js';
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_PROFILE } from '../lib/contact.js';
import { ThemeToggle } from '../components/ThemeIcons.jsx';
import TryQuestion from '../components/TryQuestion.jsx';

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

/* ── The sections under the sign-in ───────────────────────────────── */

const WAYS = [
  { name: 'Study', icon: '📚', fill: 'violet', tilt: -1.2,
    desc: 'Browse a lecture with each answer and explanation shown as you go. Nothing is scored.' },
  { name: 'Practice', icon: '🎯', fill: 'mint', tilt: 1,
    desc: 'A mixed set with the answer after every question, saved to your history.' },
  { name: 'Exam', icon: '📝', fill: 'coral', tilt: -0.8,
    desc: 'A full set with the answers held back until you submit, then scored.' },
];

// Taken in any semester, so they are listed apart from the semester subjects.
const ELECTIVES = ['history-of-medicine', 'physics', 'chemistry', 'medicine-art'];
const SUBJECT_GROUPS = [
  ...['1', '2', '4'].map((sem) => ({
    name: `Semester ${sem}`,
    keys: Object.keys(SUBJECTS).filter((k) => !ELECTIVES.includes(k) && inSemester(SUBJECTS[k], sem)),
  })),
  { name: 'Electives', keys: ELECTIVES.filter((k) => SUBJECTS[k]) },
];

// Layout stand-ins for local development only (see Reviews below).
const SAMPLE_REVIEWS = [
  { id: 's1', name: 'Sample', rating: 5, body: 'I strongly recommend' },
  { id: 's2', name: 'Sample', rating: 5, body: 'The explanations under each answer are what helped me most. I did the Glycolysis lecture twice before the quiz.' },
  { id: 's3', name: 'Sample', rating: 4, body: 'أفضل شيء هو مراجعة الأسئلة التي أخطأت فيها قبل الامتحان.' },
  { id: 's4', name: 'Sample', rating: 5, body: 'Exam mode feels like the real thing. More past papers please!' },
];

const NOTE_FILLS = ['yellow', 'mint', 'blue', 'coral', 'violet', 'orange'];
const NOTE_TILTS = [-1.4, 1.1, -0.8, 1.5, -1.2, 0.9];

function Ways() {
  return (
    <section className="landing-section" aria-labelledby="ways-title">
      <h2 id="ways-title" className="landing-h2">Three ways to work through a lecture</h2>
      <ul className="ways">
        {WAYS.map((w) => (
          <li key={w.name} className={'way fill-' + w.fill} style={{ '--tilt': w.tilt + 'deg' }}>
            <span className="way-icon" aria-hidden="true">{w.icon}</span>
            <h3>{w.name}</h3>
            <p>{w.desc}</p>
          </li>
        ))}
      </ul>
      <p className="landing-aside">
        Every account also gets flashcards with spaced repetition, a list of the questions you got wrong,
        a performance page and a weekly leaderboard.
      </p>
    </section>
  );
}

function Subjects({ counts }) {
  return (
    <section className="landing-section" aria-labelledby="subjects-title">
      <h2 id="subjects-title" className="landing-h2">What is inside</h2>
      <div className="shelf">
        {SUBJECT_GROUPS.map((group) => (
          <div key={group.name} className="shelf-group">
            <h3>{group.name}</h3>
            <ul>
              {group.keys.map((key) => {
                const cfg = SUBJECTS[key];
                const n = counts ? cfg.sources.reduce((sum, s) => sum + (counts[s.table] ?? 0), 0) : 0;
                return (
                  <li key={key}>
                    <span className="shelf-name">{cfg.title.replace(/ MCQ$/, '')}</span>
                    {n ? <span className="shelf-n">{n.toLocaleString()}</span> : null}
                    <span className="shelf-desc">{cfg.description}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Approved student reviews, as on the signed-in home page. Shown from the
   first one; the section is absent while there are none. */
function Reviews() {
  const { data: items = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: ({ signal }) => fetchApprovedReviews(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  // The local dev server has no /api, so nothing loads there: show stand-ins
  // to judge the layout. import.meta.env.DEV is false in the built site, so
  // these never reach a student.
  const sampled = import.meta.env.DEV && !items.length;
  const shown = sampled ? SAMPLE_REVIEWS : items;
  if (!shown.length) return null;
  return (
    <section className="landing-section" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="landing-h2">What students say</h2>
      {sampled ? <p className="landing-aside sample-flag">Preview only: made-up reviews to show the layout. The live site shows approved reviews.</p> : null}
      <ul className="review-notes">
        {shown.slice(0, 9).map((r, i) => (
          <li key={r.id} className={'review-note fill-' + NOTE_FILLS[i % NOTE_FILLS.length]}
              style={{ '--tilt': NOTE_TILTS[i % NOTE_TILTS.length] + 'deg' }}>
            <span className="review-stars" aria-label={`${r.rating} out of 5 stars`}>
              {'★'.repeat(r.rating)}<span>{'★'.repeat(5 - r.rating)}</span>
            </span>
            <p dir="auto">{r.body}</p>
            <b>{r.name}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Plans({ onSignIn }) {
  return (
    <section className="landing-section" aria-labelledby="plans-title">
      <h2 id="plans-title" className="landing-h2">Free to start</h2>
      <div className="plans">
        <div className="plan fill-mint" style={{ '--tilt': '-0.8deg' }}>
          <h3>Free</h3>
          <ul>
            <li>The first {FREE_LECTURES} lectures of every subject</li>
            <li>Study, practice, exam and flashcards</li>
            <li>The weekly leaderboard</li>
          </ul>
        </div>
        <div className="plan fill-yellow" style={{ '--tilt': '0.9deg' }}>
          <h3>Pass, {PASS_PRICE} per semester</h3>
          <ul>
            <li>Every lecture of every subject</li>
            <li>Past papers and cases</li>
            <li>University accounts can try it free for 3 days</li>
          </ul>
        </div>
      </div>
      <div className="landing-close">
        <p>Your scores, streak and wrong answers are saved to your account and follow you to any device.</p>
        <button type="button" className="btn primary lg" onClick={onSignIn}>Let's start studying</button>
      </div>
    </section>
  );
}

/* The only way into the app: everyone signs in (Google or email/password)
   before reaching any subject content. AuthGate renders this whenever there
   is no session, so it is also the site's front page: what Labobo is, a
   question to try, what is inside and what students say, around the sign-in. */
export default function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const googleRef = useRef(null);

  useEffect(() => { document.title = 'Studywith Labobo — practice questions for medical students'; }, []);

  // Public and CDN-cached; the same request the signed-in home page makes.
  const { data: counts } = useQuery({
    queryKey: ['question-counts', ALL_QUESTION_TABLES],
    queryFn: ({ signal }) => fetchTableCounts(ALL_QUESTION_TABLES, signal),
    staleTime: 5 * 60_000,
  });
  const total = counts ? Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0) : 0;

  /* Every "sign in" button on the page leads to the one sign-in card. */
  function toSignIn() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('sign-in')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    googleRef.current?.focus({ preventScroll: true });
  }

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
    <>
    <header className="appbar">
      <span className="wordmark">
        <img src="/theme/app-icon.webp" alt="" width="40" height="40" />
        <span>Studywith <b>Labobo</b></span>
      </span>
      <div className="appbar-actions">
        <ThemeToggle />
        <button type="button" className="btn sm appbar-signin" onClick={toSignIn}>Sign in</button>
      </div>
    </header>

    <main className="landing">
      <div className="hero">
      <div className="hero-text">
        <h1>Practice questions for every lecture.</h1>
        <p className="lede">
          {total ? total.toLocaleString() : 'Thousands of'} multiple-choice questions for medical students in
          semesters 1, 2 and 4, sorted lecture by lecture, each with its explanation.
        </p>

        <div className="nametag" id="sign-in">
          <p className="nametag-band">Sign in to start studying</p>
          <div className="nametag-body login-actions">
            <button ref={googleRef} type="button" className="btn lg block" disabled={busy} onClick={google}>
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
        </div>

        <p className="form-error" role="alert">{error}</p>
        {notice ? <p className="form-notice" role="status">{notice}</p> : null}
        <p className="login-terms">
          Free to start: the first {FREE_LECTURES} lectures of every subject.
        </p>
      </div>

      <TryQuestion onSignIn={toSignIn} />
      </div>

      <Ways />
      <Subjects counts={counts} />
      <Reviews />
      <Plans onSignIn={toSignIn} />
    </main>

    <footer className="landing-foot">
      <Link to="/terms">Terms, refunds and privacy</Link>
      <a href={INSTAGRAM_PROFILE} target="_blank" rel="noopener noreferrer">@{INSTAGRAM_HANDLE} on Instagram</a>
      <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
    </footer>
    </>
  );
}
