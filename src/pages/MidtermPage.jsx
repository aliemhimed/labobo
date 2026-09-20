import { useEffect, useMemo, useState } from 'react';
import { useQuestions } from '../hooks/useQuestions.js';
import { MIDTERM } from '../lib/subjects.js';
import { LETTERS, shuffle } from '../lib/utils.js';
import '../styles/midterm.css';

/* Obfuscated check — not real security, the same as the original page.
   Anyone can read it out of the bundle; the page is hidden by obscurity
   (nothing on the main site links to it). Comparison ignores case and all
   whitespace, so "aligotyourback123" and "Ali got your back 123" both work. */
const PASSWORD = 'aligotyourback123';
const SESSION_KEY = 'labobo_midterm_unlocked_v1';
const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, '').trim();

const SUBJECT_FILTERS = ['All', 'Biochemistry', 'Molecular Biology', 'Genetics', 'Histology'];

function Gate({ onUnlock }) {
  const [error, setError] = useState(false);
  const [value, setValue] = useState('');

  function submit(e) {
    e.preventDefault();
    if (normalize(value) === normalize(PASSWORD)) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
      onUnlock();
    } else {
      setError(true);
      setValue('');
      setTimeout(() => setError(false), 1800);
    }
  }

  return (
    <div className="center-shell">
      <div className="card gate">
        <div className="gate-icon">
          <svg viewBox="0 0 24 24">
            <path d="M18 8h-1V6a5 5 0 1 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6zm3 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
          </svg>
        </div>
        <h1>Midterm Review</h1>
        <p>This page is private. Enter the password to continue.</p>
        <form onSubmit={submit} autoComplete="off">
          <input type="password" placeholder="Password" autoFocus value={value}
                 onChange={(e) => setValue(e.target.value)} />
          <div className={'gate-error' + (error ? ' show' : '')}>Incorrect password.</div>
          <button className="btn-primary" type="submit">Unlock</button>
        </form>
      </div>
    </div>
  );
}

export default function MidtermPage() {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });
  const { questions, status, error, reload } = useQuestions(MIDTERM);

  const [subject, setSubject] = useState('All');
  const [mode, setMode] = useState(null);
  const [examCount, setExamCount] = useState(30);
  const [session, setSession] = useState(null); // {questions, answers, idx, locked}
  const [done, setDone] = useState(false);

  useEffect(() => { document.title = 'Midterm Review — Studywith Labobo'; }, []);

  const pool = useMemo(
    () => (subject === 'All' ? questions : questions.filter((q) => q.subject === subject)),
    [questions, subject]
  );

  function start() {
    const picked = mode === 'exam' ? shuffle(pool).slice(0, Math.min(examCount, pool.length)) : pool.slice();
    setSession({ questions: picked, answers: new Array(picked.length).fill(null), idx: 0, locked: false });
    setDone(false);
  }

  function backToMenu() {
    setSession(null);
    setDone(false);
  }

  function lock() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setUnlocked(false);
    backToMenu();
  }

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />;

  const topbar = (
    <div className="topbar">
      <div className="topbar-title">Midterm Review <span className="badge">Private</span></div>
      <div className="topbar-actions">
        <button className="btn-ghost" onClick={backToMenu}>Menu</button>
        <button className="btn-ghost" onClick={lock}>Lock</button>
      </div>
    </div>
  );

  if (status === 'loading' || status === 'error' || status === 'empty') {
    return (
      <div>
        {topbar}
        <div className="shell">
          <div className="controls">
            {status === 'loading' ? <div className="info">Loading questions…</div> : null}
            {status === 'empty' ? (
              <div className="info">
                No midterm questions in the database yet. Add rows to{' '}
                {MIDTERM.sources.map((s) => s.table).join(', ')} in Supabase.
              </div>
            ) : null}
            {status === 'error' ? (
              <div className="info">Couldn't load questions: {String(error?.message || error)}</div>
            ) : null}
            {status !== 'loading' ? (
              <div className="start-row">
                <div className="info" />
                <button className="btn-start" onClick={reload}>Try again</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  /* ── result ─────────────────────────────────────────────────────── */
  if (done && session) {
    const n = session.questions.length;
    let correct = 0;
    const wrongs = [];
    session.questions.forEach((q, i) => {
      if (session.answers[i] === q.answer) correct++;
      else wrongs.push({ i, q, ans: session.answers[i] });
    });
    const pct = n ? Math.round((correct / n) * 100) : 0;

    return (
      <div>
        {topbar}
        <div className="shell">
          <div className="result">
            <p className="result-sub">{mode === 'exam' ? 'Exam' : 'Practice'} complete</p>
            <div className="result-score">{correct} / {n}</div>
            <p className="result-sub">{pct}% correct</p>
            <div className="result-actions">
              <button className="btn-start" onClick={start}>Try again</button>
              <button className="btn-ghost" onClick={backToMenu}>Back to menu</button>
            </div>
          </div>
          <div className="wrong-list">
            {wrongs.length ? (
              <>
                <h3>Wrong answers ({wrongs.length})</h3>
                {wrongs.map((w) => (
                  <div key={w.i} className="wrong-q">
                    <div className="meta">Q{w.i + 1} · {w.q.subject} · {w.q.topic}</div>
                    <div className="qtext">{w.q.q}</div>
                    <div className="you">
                      <strong>Your answer:</strong>{' '}
                      {w.ans == null ? 'Skipped' : `${LETTERS[w.ans]}) ${w.q.options[w.ans]}`}
                    </div>
                    <div className="right">
                      <strong>Correct:</strong> {LETTERS[w.q.answer]}) {w.q.options[w.q.answer]}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <h3 style={{ color: 'var(--correct)' }}>No wrong answers — full marks.</h3>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── study ──────────────────────────────────────────────────────── */
  if (session && mode === 'study') {
    return (
      <div>
        {topbar}
        <div className="shell">
          <div className="controls" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>
              Showing <strong>{session.questions.length}</strong> questions. Correct answers are
              highlighted in green.
            </div>
          </div>
          <div>
            {session.questions.map((q, i) => (
              <div key={q.id} className="study-q">
                <div className="qhead">
                  <span className="qnum">Question {i + 1} of {session.questions.length}</span>
                  <span className="topic">{q.subject} · {q.topic}</span>
                </div>
                <div className="qtext">{q.q}</div>
                <div className="opts">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={'opt' + (oi === q.answer ? ' correct' : '')}>
                      <div className="letter">{LETTERS[oi]}</div>
                      <div className="body">{opt}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── practice / exam ────────────────────────────────────────────── */
  if (session) {
    const q = session.questions[session.idx];
    const n = session.questions.length;
    const selected = session.answers[session.idx];
    const isPractice = mode === 'practice';
    const revealed = isPractice && session.locked;

    function select(oi) {
      if (isPractice && session.locked) return;
      setSession((s) => {
        const answers = s.answers.slice();
        answers[s.idx] = oi;
        return { ...s, answers, locked: isPractice ? true : s.locked };
      });
    }

    function next() {
      if (session.idx + 1 < n) setSession((s) => ({ ...s, idx: s.idx + 1, locked: false }));
      else setDone(true);
    }

    const showNext = isPractice || selected !== null;

    return (
      <div>
        {topbar}
        <div className="shell">
          <div className="qcard">
            <div className="qmeta">
              <span>Question {session.idx + 1} / {n}</span>
              <span className="topic">{q.subject} · {q.topic}</span>
            </div>
            <div className="qprogress">
              <div className="qprogress-bar" style={{ width: `${(((session.idx + 1) / n) * 100).toFixed(1)}%` }} />
            </div>
            <div className="qtext">{q.q}</div>
            <div className="opts">
              {q.options.map((opt, oi) => {
                let cls = 'opt';
                if (revealed) {
                  cls += ' locked';
                  if (oi === q.answer) cls += ' correct';
                  else if (oi === selected) cls += ' wrong';
                } else if (!isPractice && oi === selected) {
                  cls += ' selected';
                }
                return (
                  <button type="button" key={oi} className={cls} onClick={() => select(oi)}>
                    <div className="letter">{LETTERS[oi]}</div>
                    <div className="body">{opt}</div>
                  </button>
                );
              })}
            </div>
            {revealed ? (
              <div className={'feedback ' + (selected === q.answer ? 'correct' : 'wrong')}>
                {selected === q.answer ? (
                  <strong>Correct.</strong>
                ) : (
                  <>
                    <strong>Incorrect.</strong> Correct answer: {LETTERS[q.answer]}) {q.options[q.answer]}
                  </>
                )}
              </div>
            ) : null}
            <div className="nav-row">
              <span className="muted">
                {revealed ? '' : isPractice
                  ? 'Pick an answer for feedback, or skip to the next.'
                  : 'Select your answer, then press Next.'}
              </span>
              {showNext ? (
                <button className="btn-next" onClick={next}>
                  {isPractice && !session.locked ? 'Skip →' : 'Next →'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── menu ───────────────────────────────────────────────────────── */
  const ready = mode && pool.length > 0;
  let info;
  if (!mode) info = 'Choose a mode to start.';
  else if (pool.length === 0) info = 'No questions for this subject.';
  else if (mode === 'exam') {
    const n = Math.min(examCount, pool.length);
    const note = examCount > pool.length ? ` (only ${pool.length} available — will use all of them)` : '';
    info = `${n} random questions from ${subject} — Exam Mode${note}.`;
  } else {
    info = `${pool.length} questions in ${subject} — ${mode === 'study' ? 'Study Mode' : 'Practice Mode'}.`;
  }

  return (
    <div>
      {topbar}
      <div className="shell">
        <div className="controls">
          <div className="control-row">
            <label>Subject filter</label>
            <div className="chip-group">
              {SUBJECT_FILTERS.map((s) => {
                const count = s === 'All'
                  ? questions.length
                  : questions.filter((q) => q.subject === s).length;
                return (
                  <button key={s} className={'chip' + (s === subject ? ' active' : '')}
                          onClick={() => setSubject(s)}>
                    {s} ({count})
                  </button>
                );
              })}
            </div>
          </div>
          <div className="control-row">
            <label>Mode</label>
            <div className="chip-group">
              {[['study', 'Study Mode'], ['practice', 'Practice Mode'], ['exam', 'Exam Mode']].map(([m, label]) => (
                <button key={m} className={'chip' + (mode === m ? ' active' : '')}
                        onClick={() => setMode(m)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {mode === 'exam' ? (
            <div className="control-row">
              <label>Number of questions (random)</label>
              <div className="chip-group">
                {[30, 60, 90].map((n) => (
                  <button key={n} className={'chip' + (examCount === n ? ' active' : '')}
                          onClick={() => setExamCount(n)}>
                    {n} questions
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="start-row">
            <div className="info">{info}</div>
            <button className="btn-start" disabled={!ready} onClick={start}>Start</button>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>
          Study Mode shows all questions with answers visible. Practice gives instant feedback per
          question. Exam shows your score only at the end. Questions stay in their source order —
          no shuffle.
        </p>
      </div>
    </div>
  );
}
