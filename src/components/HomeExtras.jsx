import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createSubjectStore } from '../lib/storage.js';
import { dueIds } from '../lib/srs.js';
import { CHANGELOG, SHOW_DAYS } from '../lib/changelog.js';
import { Cross } from './Icons.jsx';
import { currentSubscription, disableReminder, enableReminder, isIos, isStandalone, pushSupported, savedHour } from '../lib/push.js';

const DAY = 86_400_000;

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full or blocked */ }
}

/* ── First visit: what to do first ───────────────────────────────── */

export function StartHere({ subjects }) {
  const first = subjects[0];
  if (!first) return null;
  return (
    <section className="start-here" aria-labelledby="start-here-title">
      <h2 id="start-here-title">New here? Start with three steps</h2>
      <ol>
        <li><b>Pick a subject</b> from the cards below. Each lecture has its own questions.</li>
        <li><b>Read the study guide</b> for a lecture, if it has one, then try <b>Study</b> mode: you see each answer as you go.</li>
        <li><b>Do a 10-question practice set.</b> Finishing one starts your streak, and anything you miss comes back for review.</li>
      </ol>
      <Link className="btn primary" to={`${first.to}/study`}>Start with {first.name}</Link>
    </section>
  );
}

/* ── Spaced review due across the semester ───────────────────────── */

export function DueToday({ subjects, storageVersion }) {
  const due = useMemo(() => subjects
    .map((s) => {
      const store = createSubjectStore(s.storagePrefix);
      return { ...s, n: dueIds(store.getSrs(), store.getWrong()).length };
    })
    .filter((s) => s.n > 0),
  // storageVersion: re-count when progress changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [subjects, storageVersion]);
  if (!due.length) return null;
  const total = due.reduce((n, s) => n + s.n, 0);
  return (
    <section className="due-today" aria-labelledby="due-title">
      <h2 id="due-title" className="section-title">⏰ {total} question{total === 1 ? '' : 's'} due for review today</h2>
      <p className="due-sub">Questions you missed, back on schedule so they stick.</p>
      <div className="resume-list">
        {due.map((s) => (
          <Link key={s.key} to={s.to} state={{ start: 'review-due' }} className="resume-link">
            <span className="resume-subject">{s.name}</span>
            <span className="resume-mode">{s.n} due</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── Exam countdown ───────────────────────────────────────────────── */

const examKey = (semester) => `labobo.exams.${semester || 'any'}`;
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* The student's next exam for this semester, kept on this device: days
   left and how many questions a day would cover every question once. */
export function ExamCountdown({ semester, totalQuestions }) {
  const [exams, setExams] = useState(() => readJson(examKey(semester), []));
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const today = startOfDay(Date.now());
  const upcoming = exams
    .map((e) => ({ ...e, at: startOfDay(Date.parse(e.date + 'T00:00:00')) }))
    .filter((e) => e.at >= today)
    .sort((a, b) => a.at - b.at);
  const next = upcoming[0];

  function save(list) {
    setExams(list);
    writeJson(examKey(semester), list);
  }
  function add(e) {
    e.preventDefault();
    if (!date) return;
    save([...exams.filter((x) => startOfDay(Date.parse(x.date + 'T00:00:00')) >= today),
      { name: name.trim().slice(0, 40) || 'Exam', date }]);
    setName(''); setDate(''); setEditing(false);
  }

  if (editing || !next) {
    return (
      <form className="countdown edit" onSubmit={add} aria-label="Add an exam date">
        <p className="countdown-title">{next ? 'Add another exam' : 'When is your next exam?'}</p>
        <div className="countdown-fields">
          <label>
            <span>Exam</span>
            <input type="text" value={name} maxLength={40} placeholder="Midterm" onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span>Date</span>
            <input type="date" required value={date} min={new Date(today).toISOString().slice(0, 10)}
                   onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <div className="countdown-actions">
          <button type="submit" className="btn primary">Save</button>
          {next ? <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button> : null}
        </div>
      </form>
    );
  }

  const days = Math.round((next.at - today) / DAY);
  const perDay = totalQuestions && days > 0 ? Math.ceil(totalQuestions / days) : null;
  return (
    <section className="countdown" aria-label="Exam countdown">
      <p className="countdown-title">{next.name}</p>
      <p className="countdown-days">
        {days === 0 ? 'Today. Good luck!' : <><b>{days}</b> day{days === 1 ? '' : 's'} left</>}
      </p>
      {perDay ? (
        <p className="countdown-foot">About {perDay.toLocaleString()} questions a day covers all {totalQuestions.toLocaleString()} once.</p>
      ) : null}
      <div className="countdown-actions">
        <button type="button" className="link-btn" onClick={() => setEditing(true)}>Add exam</button>
        <button type="button" className="link-btn" onClick={() => save(exams.filter((x) => x.date !== next.date || x.name !== next.name))}>
          Remove
        </button>
      </div>
    </section>
  );
}

/* ── You asked, we added ──────────────────────────────────────────── */

const SEEN_KEY = 'labobo.changelog.closed';

export function YouAsked({ semester }) {
  const [closed, setClosed] = useState(() => readJson(SEEN_KEY, []));
  const now = Date.now();
  const item = CHANGELOG.find((c) => !closed.includes(c.id)
    && now - Date.parse(c.date) < SHOW_DAYS * DAY
    && (!c.semester || c.semester === semester));
  if (!item) return null;
  function close() {
    const next = [...closed, item.id].slice(-50);
    setClosed(next);
    writeJson(SEEN_KEY, next);
  }
  return (
    <aside className="you-asked" aria-labelledby="you-asked-title">
      <p className="you-asked-tag">You asked, we added</p>
      <h2 id="you-asked-title">{item.title}</h2>
      <p>{item.body}</p>
      <button type="button" className="you-asked-close" onClick={close} aria-label="Close this note"><Cross /></button>
    </aside>
  );
}

/* ── Daily study reminder ─────────────────────────────────────────── */

const HOURS = Array.from({ length: 24 }, (_, h) => h).filter((h) => h >= 7);
const hourLabel = (h) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function ReminderCard() {
  const [state, setState] = useState('checking'); // checking | off | on | busy | unsupported | ios-install
  const [hour, setHour] = useState(savedHour);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!pushSupported()) { setState(isIos() && !isStandalone() ? 'ios-install' : 'unsupported'); return; }
    currentSubscription()
      .then((sub) => setState(sub && Notification.permission === 'granted' ? 'on' : 'off'))
      .catch(() => setState('off'));
  }, []);

  if (state === 'checking' || state === 'unsupported') return null;

  async function turnOn(h = hour) {
    setState('busy'); setMessage('');
    try {
      await enableReminder(h);
      setState('on');
    } catch (e) {
      setMessage(e.message);
      setState('off');
    }
  }
  async function turnOff() {
    setState('busy'); setMessage('');
    await disableReminder();
    setState('off');
  }

  return (
    <section className="reminder" aria-labelledby="reminder-title">
      <p id="reminder-title" className="countdown-title">🔔 Daily reminder</p>
      {state === 'ios-install' ? (
        <p className="countdown-foot">On iPhone, add Labobo to your home screen first (Share, then Add to Home Screen), then open it from there to turn reminders on.</p>
      ) : (
        <>
          <p className="countdown-foot">
            {state === 'on' ? 'We’ll nudge you at' : 'Get a nudge at'}{' '}
            <select aria-label="Reminder time" value={hour} disabled={state === 'busy'}
                    onChange={(e) => { const h = Number(e.target.value); setHour(h); if (state === 'on') turnOn(h); }}>
              {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>{' '}
            if you haven’t studied that day.
          </p>
          <div className="countdown-actions">
            {state === 'on'
              ? <button type="button" className="link-btn" onClick={turnOff}>Turn off</button>
              : <button type="button" className="btn primary sm" disabled={state === 'busy'} onClick={() => turnOn()}>
                  {state === 'busy' ? 'Turning on…' : 'Turn on'}
                </button>}
          </div>
          {message ? <p className="reminder-error" role="alert">{message}</p> : null}
        </>
      )}
    </section>
  );
}
