import { useCallback, useEffect, useRef, useState } from 'react';
import Dialog from './Dialog.jsx';
import { useToast } from './Toast.jsx';
import { fetchBoard, fmtCountdown, fmtTime, submitScore } from '../lib/leaderboard.js';
import { validateHandle } from '../lib/profanity.js';
import { getLeaderboardPrefs, getUser, setLeaderboardPrefs } from '../lib/storage.js';
import '../styles/overlays.css';

const MEDALS = ['🥇', '🥈', '🥉'];

/* ── the board ───────────────────────────────────────────────────── */

function BoardDialog({ subject, onClose }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const ctrl = new AbortController();
    fetchBoard(subject, getUser()?.deviceId, ctrl.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        if (ctrl.signal.aborted) return;
        console.error('[leaderboard] load failed', error);
        setState({ status: 'error', message: error.message });
      });
    return () => ctrl.abort();
  }, [subject]);

  const { data } = state;
  let body;
  if (state.status === 'loading') {
    body = <div className="lb-empty"><div className="lb-empty-icon">⏳</div>Loading leaderboard…</div>;
  } else if (state.status === 'error') {
    body = (
      <div className="lb-empty">
        <div className="lb-empty-icon">⚠️</div>
        Couldn't load the leaderboard.<br /><small>{state.message}</small>
      </div>
    );
  } else if (!data.top?.length) {
    body = (
      <div className="lb-empty">
        <div className="lb-empty-icon">🌱</div>
        No entries yet this week.<br />Be the first — take a 30-question exam!
      </div>
    );
  } else {
    body = (
      <>
        <table className="lb-table">
          <thead>
            <tr>
              <th>Rank</th><th>Handle</th>
              <th style={{ textAlign: 'right' }}>Score</th><th style={{ textAlign: 'right' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {data.top.map((entry, i) => (
              <tr key={i} className={entry.is_me ? 'lb-me' : ''}>
                <td className="lb-rank">{MEDALS[i] ? <span className="lb-medal">{MEDALS[i]}</span> : i + 1}</td>
                <td className="lb-handle">
                  {entry.handle}
                  {entry.is_me ? <span style={{ fontSize: 11, color: 'var(--brand, #2563eb)' }}> (you)</span> : null}
                </td>
                <td className="lb-score">{Number(entry.score_pct).toFixed(0)}%</td>
                <td className="lb-time">{fmtTime(entry.time_seconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.my_entry && data.my_rank > 10 ? (
          <div className="lb-myrank">
            Your rank: <strong>#{data.my_rank}</strong> &nbsp;·&nbsp;
            {Number(data.my_entry.score_pct).toFixed(0)}% &nbsp;·&nbsp; {fmtTime(data.my_entry.time_seconds)}
          </div>
        ) : null}
        {!data.my_entry ? (
          <div className="lb-myrank"
               style={{ background: 'transparent', borderStyle: 'dashed', color: 'var(--text-muted, #6b7280)' }}>
            You haven't submitted a 30-question exam this week.
          </div>
        ) : null}
      </>
    );
  }

  return (
    <Dialog onClose={onClose} labelledBy="lb-title">
      <h3 id="lb-title">🏆 Weekly Leaderboard — {subject}</h3>
      <div className="lb-sub">{data ? fmtCountdown(data.week_start) : state.status === 'loading' ? 'Loading…' : ' '}</div>
      <div aria-live="polite">{body}</div>
      <div className="lb-meta">
        <span>30-question exams only</span>
        <button className="lb-btn" onClick={onClose}>Close</button>
      </div>
    </Dialog>
  );
}

/* ── opt-in and handle picker ────────────────────────────────────── */

function OptInDialog({ onChoose }) {
  return (
    <Dialog onClose={() => onChoose(null)} labelledBy="lb-optin-title">
      <h3 id="lb-optin-title">🏆 Submit to the weekly leaderboard?</h3>
      <div className="lb-sub">Your score will be visible to all players on this subject's board until Sunday night.</div>
      <p>Compete by your <strong>highest 30-question exam score</strong> this week. Each subject has its own board, resetting every Monday.</p>
      <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>
        You'll pick a public handle (e.g. <code>MedGenius</code>). Your real name stays private.
      </p>
      <div className="lb-actions">
        <button className="lb-btn" onClick={() => onChoose('never')}>No, never ask again</button>
        <button className="lb-btn" onClick={() => onChoose('once')}>Yes, just this one</button>
        <button className="lb-btn lb-btn-primary" onClick={() => onChoose('always')}>Yes, every time</button>
      </div>
    </Dialog>
  );
}

function HandleDialog({ realName, onDone }) {
  const [value, setValue] = useState(() => (realName || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16));
  const [error, setError] = useState('');

  function save() {
    const problem = validateHandle(value);
    if (problem) { setError(problem); return; }
    onDone(value.trim());
  }

  return (
    <Dialog onClose={() => onDone(null)} labelledBy="lb-handle-title">
      <h3 id="lb-handle-title">Choose your leaderboard handle</h3>
      <div className="lb-sub">3–20 characters. Letters, numbers, _ and - only.</div>
      <p style={{ fontSize: 13.5 }}>
        This is the only name shown publicly. Your real name (
        {realName ? <strong>{realName}</strong> : 'from registration'}) stays private.
      </p>
      <label htmlFor="lb-handle-input" className="sr-only">Leaderboard handle</label>
      <input id="lb-handle-input" type="text" className="lb-input" value={value} maxLength={20}
             placeholder="e.g. MedGenius99" autoComplete="off"
             onChange={(e) => { setValue(e.target.value); setError(''); }}
             onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
      <div className="lb-error" role="alert">{error}</div>
      <div className="lb-actions">
        <button className="lb-btn" onClick={() => onDone(null)}>Cancel</button>
        <button className="lb-btn lb-btn-primary" onClick={save}>Save handle</button>
      </div>
    </Dialog>
  );
}

/* ── the flow ────────────────────────────────────────────────────── */

/**
 * useLeaderboard(subject) -> { element, openBoard, submitExam }
 * Render `element` once; call openBoard() from a button and submitExam(result)
 * after a 30-question exam. submitExam walks through the opt-in and handle
 * dialogs as needed, then posts the score and shows the outcome as a toast.
 */
export function useLeaderboard(subject) {
  const toast = useToast();
  const [dialog, setDialog] = useState(null); // { type, ...props }
  const pending = useRef(null); // resolver for the dialog that is waiting on an answer

  const ask = useCallback((type, props) => new Promise((resolve) => {
    pending.current = resolve;
    setDialog({ type, ...props });
  }), []);

  const settle = useCallback((value) => {
    const resolve = pending.current;
    pending.current = null;
    setDialog(null);
    resolve?.(value);
  }, []);

  const openBoard = useCallback(() => setDialog({ type: 'board' }), []);

  const submitExam = useCallback(async ({ score_pct, total_questions, time_seconds }) => {
    if (Number(total_questions) !== 30) return;
    const user = getUser();
    if (!user?.deviceId) {
      toast('Please register a name first to submit to the leaderboard.');
      return;
    }

    let prefs = getLeaderboardPrefs();
    if (prefs.opt_in_pref === 'never') return;

    if (prefs.opt_in_pref !== 'always') {
      const choice = await ask('optin');
      if (!choice) return;
      if (choice === 'never' || choice === 'always') setLeaderboardPrefs({ opt_in_pref: choice });
      if (choice === 'never') return;
    }

    let handle = prefs.handle;
    if (!handle) {
      handle = await ask('handle', { realName: user.name });
      if (!handle) return;
      setLeaderboardPrefs({ handle });
    }

    try {
      const result = await submitScore({
        device_id: user.deviceId, handle, subject, score_pct, total_questions, time_seconds,
      });
      toast(result.action === 'kept_existing'
        ? `Your best this week is still ${Number(result.entry.score_pct).toFixed(0)}%`
        : `Submitted! Rank #${result.my_rank} this week 🏆`);
      setTimeout(() => setDialog({ type: 'board' }), 1500);
    } catch (e) {
      console.error('[leaderboard] submit failed', e);
      toast(`Could not submit to the leaderboard: ${e.message}`);
    }
  }, [ask, subject, toast]);

  let element = null;
  if (dialog?.type === 'board') element = <BoardDialog subject={subject} onClose={() => setDialog(null)} />;
  else if (dialog?.type === 'optin') element = <OptInDialog onChoose={settle} />;
  else if (dialog?.type === 'handle') element = <HandleDialog realName={dialog.realName} onDone={settle} />;

  return { element, openBoard, submitExam };
}
