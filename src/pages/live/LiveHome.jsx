import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import { fetchHistory, fetchLiveMe, joinRoom } from '../../lib/live.js';
import { sendUniCode, verifyUniCode } from '../../lib/access.js';

/* The EU email step, same flow as the plan page: send a code, enter it. */
function UniEmailBox({ onDone }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(e) {
    e?.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await sendUniCode(email.trim());
      setSent(r.email || email.trim()); setCode('');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function verify(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await verifyUniCode(code);
      await onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="live-uni uni-email">
      <p><b>Confirm your EU university email</b></p>
      <p>Live quizzes are for EU students. We send a 6-digit code to your university email, one time only.</p>
      {!sent ? (
        <form className="uni-email-row" onSubmit={send}>
          <input type="email" inputMode="email" autoComplete="email" required placeholder="name@eu.edu.ge"
                 aria-label="Your university email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="btn" disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Send code'}</button>
        </form>
      ) : (
        <>
          <p className="uni-email-note" role="status">We sent a code to {sent}. Check spam if it is not there.</p>
          <form className="uni-email-row" onSubmit={verify}>
            <input type="text" className="uni-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                   placeholder="6-digit code" aria-label="Code from the email" value={code}
                   onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            <button type="submit" className="btn primary" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Confirm and join'}</button>
          </form>
          <p className="uni-email-again">
            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => send()}>Send a new code</button>
            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => { setSent(''); setCode(''); setError(''); }}>Use a different address</button>
          </p>
        </>
      )}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}

export default function LiveHome() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get('code') || '').replace(/\D/g, '').slice(0, 6));
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needUni, setNeedUni] = useState(false);

  const me = useQuery({ queryKey: ['live-me'], queryFn: fetchLiveMe, staleTime: 60_000, retry: false });
  const history = useQuery({ queryKey: ['live-history'], queryFn: fetchHistory, staleTime: 30_000, retry: false });

  async function join() {
    setBusy(true); setError('');
    try {
      const out = await joinRoom(code, nickname.trim());
      setNeedUni(false);
      if (out.status === 'host') navigate(`/live/teach/room/${out.room}`);
      else navigate(`/live/play/${out.room}`);
    } catch (e) {
      if (e.code === 'uni_email_required') { setNeedUni(true); setError(''); }
      else setError(e.message);
    } finally { setBusy(false); }
  }

  const sessions = history.data?.sessions || [];

  return (
    <>
      <TopBar subtitle="Live" />
      <main id="main" tabIndex={-1} className="container narrow live-home">
        <h1 className="live-title">Labobo Live</h1>
        <form className="live-join" onSubmit={(e) => { e.preventDefault(); join(); }}>
          <label className="field-label" htmlFor="live-code">Room code</label>
          <input id="live-code" className="live-code-input" type="text" inputMode="numeric" autoComplete="off"
                 placeholder="000000" maxLength={6} value={code}
                 onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <label className="field-label" htmlFor="live-nick">Nickname (optional)</label>
          <input id="live-nick" type="text" maxLength={24} autoComplete="off" placeholder="Shown on the screen"
                 value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <button type="submit" className="btn primary lg block" disabled={busy || code.length !== 6}>
            {busy ? 'Joining…' : 'Join'}
          </button>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </form>
        {needUni ? <UniEmailBox onDone={join} /> : null}

        {me.data?.teacher ? (
          <p className="live-teacher-link"><Link to="/live/teach">Teacher dashboard</Link></p>
        ) : null}

        <section className="live-history" aria-labelledby="live-hist-h">
          <h2 id="live-hist-h">Your past sessions</h2>
          {history.isLoading ? <p className="live-muted">Loading…</p> : null}
          {!history.isLoading && sessions.length === 0 ? <p className="live-muted">Sessions you play will appear here.</p> : null}
          <ul className="live-list">
            {sessions.map((s) => (
              <li key={s.room}>
                <Link to={`/live/results/${s.room}`} className="live-row">
                  <span className="live-row-main">
                    <b>{s.title}</b>
                    <span className="live-muted">{new Date(s.date).toLocaleDateString()}</span>
                  </span>
                  <span className="live-row-side">
                    {s.score} points · {s.correct}/{s.total} · rank {s.rank} of {s.players}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
