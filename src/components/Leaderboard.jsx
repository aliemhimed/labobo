import { useCallback, useEffect, useRef, useState } from 'react';
import Dialog from './Dialog.jsx';
import { useToast } from './Toast.jsx';
import { fetchBoard, fmtCountdown, fmtTime, submitScore } from '../lib/leaderboard.js';
import { validateHandle } from '../lib/profanity.js';
import { getLeaderboardPrefs, setLeaderboardPrefs } from '../lib/storage.js';
import { useAuth } from '../lib/auth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import '../styles/overlays.css';

/* ── the board ───────────────────────────────────────────────────── */

function BoardDialog({ subject, onClose }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const ctrl = new AbortController();
    fetchBoard(subject, ctrl.signal)
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
    body = <p className="lb-empty">Loading this week’s scores</p>;
  } else if (state.status === 'error') {
    body = (
      <p className="lb-empty">Couldn’t load the leaderboard. Try again in a moment. ({state.message})</p>
    );
  } else if (!data.top?.length) {
    body = (
      <p className="lb-empty">No scores yet this week. Finish a 30-question exam to be the first.</p>
    );
  } else {
    body = (
      <>
        <table className="lb-table">
          <thead>
            <tr>
              <th className="lb-rank">Rank</th><th>Handle</th>
              <th className="lb-score">Score</th><th className="lb-time">Time</th>
            </tr>
          </thead>
          <tbody>
            {data.top.map((entry, i) => (
              <tr key={i} className={entry.is_me ? 'lb-me' : ''}>
                <td className="lb-rank">{i + 1}</td>
                <td className="lb-handle">
                  {entry.handle}
                  {entry.is_me ? <span className="lb-you"> (you)</span> : null}
                </td>
                <td className="lb-score">{Number(entry.score_pct).toFixed(0)}%</td>
                <td className="lb-time">{fmtTime(entry.time_seconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.my_entry && data.my_rank > 10 ? (
          <p className="lb-myrank">
            You’re <strong>number {data.my_rank}</strong> with {Number(data.my_entry.score_pct).toFixed(0)}%
            {data.my_entry.time_seconds != null ? ` in ${fmtTime(data.my_entry.time_seconds)}` : ''}.
          </p>
        ) : null}
        {!data.my_entry ? (
          <p className="lb-myrank none">You haven’t submitted a 30-question exam this week.</p>
        ) : null}
      </>
    );
  }

  return (
    <Dialog onClose={onClose} labelledBy="lb-title">
      <h2 id="lb-title">Weekly leaderboard</h2>
      <p className="lb-sub">{subject}{data ? `. ${fmtCountdown(data.week_start)}` : ''}</p>
      <div aria-live="polite">{body}</div>
      <div className="lb-meta">
        <span>Only 30-question exams count.</span>
        <button type="button" className="btn" onClick={onClose}>Close</button>
      </div>
    </Dialog>
  );
}

/* ── opt-in and handle picker ────────────────────────────────────── */

function OptInDialog({ onChoose }) {
  return (
    <Dialog onClose={() => onChoose(null)} labelledBy="lb-optin-title">
      <h2 id="lb-optin-title">Add this score to the weekly leaderboard?</h2>
      <p className="dialog-text">
        Each subject has its own board, ranked by everyone’s best 30-question exam this week. It
        resets every Monday.
      </p>
      <p className="dialog-text">
        Your score appears under a handle you choose. Your real name stays private.
      </p>
      <div className="dialog-actions">
        <button type="button" className="btn ghost" onClick={() => onChoose('never')}>Don’t ask again</button>
        <button type="button" className="btn" onClick={() => onChoose('once')}>Add this score</button>
        <button type="button" className="btn primary" onClick={() => onChoose('always')}>Always add my scores</button>
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
      <h2 id="lb-handle-title">Choose a leaderboard handle</h2>
      <p className="dialog-text">
        This is the only name other students see.
        {realName ? <> Your real name, {realName}, stays private.</> : ' Your real name stays private.'}
      </p>
      <label htmlFor="lb-handle-input" className="field-label">Handle</label>
      <input id="lb-handle-input" type="text" className="lb-input" value={value} maxLength={20}
             placeholder="e.g. MedGenius99" autoComplete="off"
             onChange={(e) => { setValue(e.target.value); setError(''); }}
             onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
      <p className="lb-hint">3 to 20 characters: letters, numbers, _ and -.</p>
      <p className="lb-error" role="alert">{error}</p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={() => onDone(null)}>Cancel</button>
        <button type="button" className="btn primary" onClick={save}>Save handle</button>
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
  const { user } = useAuth();
  const { data: profile } = useProfile();
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
    if (!user) return; // AuthGate means this shouldn't happen, but be defensive

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
      const realName = profile?.username || user.user_metadata?.full_name || '';
      handle = await ask('handle', { realName });
      if (!handle) return;
      setLeaderboardPrefs({ handle });
    }

    try {
      const result = await submitScore({ handle, subject, score_pct, total_questions, time_seconds });
      toast(result.action === 'kept_existing'
        ? `Your best this week is still ${Number(result.entry.score_pct).toFixed(0)}%`
        : `Score added. You’re number ${result.my_rank} this week.`);
      setTimeout(() => setDialog({ type: 'board' }), 1500);
    } catch (e) {
      console.error('[leaderboard] submit failed', e);
      toast(`Could not submit to the leaderboard: ${e.message}`);
    }
  }, [ask, subject, toast, user, profile]);

  let element = null;
  if (dialog?.type === 'board') element = <BoardDialog subject={subject} onClose={() => setDialog(null)} />;
  else if (dialog?.type === 'optin') element = <OptInDialog onChoose={settle} />;
  else if (dialog?.type === 'handle') element = <HandleDialog realName={dialog.realName} onDone={settle} />;

  return { element, openBoard, submitExam };
}
