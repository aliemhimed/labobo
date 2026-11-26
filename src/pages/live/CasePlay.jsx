import { useCallback, useEffect, useRef, useState } from 'react';
import { useCaseView } from '../../lib/live.js';
import { useConfirm } from '../../components/Confirm.jsx';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const TEXT_DELAY = 700;
const CHOICE_DELAY = 150;
const RECENT_MS = 8000;

const STATUS_TEXT = {
  closed: 'The cases are closed.',
  not_current: 'This case was already submitted by your team.',
  bad_answers: 'Could not save those answers.',
  duplicate: 'Your team already submitted this case.',
};

function blankAnswers(n) { return Array.from({ length: n }, () => ({ choice: null, text: '' })); }
function fromDraft(draft, n) {
  const blank = blankAnswers(n);
  return blank.map((b, i) => (draft?.answers?.[i] ? { choice: draft.answers[i].choice ?? null, text: draft.answers[i].text || '' } : b));
}

/** The team's shared answer for the case in front of it. */
function CaseForm({ current, act, myId, team, total, done }) {
  const { confirm, element } = useConfirm();
  const n = current.questions.length;
  const [answers, setAnswers] = useState(() => fromDraft(current.draft, n));
  const [status, setStatus] = useState(''); // '' | 'saving' | 'saved'
  const [problem, setProblem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const latest = useRef(answers);
  const timer = useRef(null);
  const focused = useRef(-1);
  const seen = useRef(current.draft?.updated_at || null);
  const position = current.position;

  const send = useCallback(async () => {
    setStatus('saving'); setProblem('');
    try {
      const out = await act('case_draft', { position, answers: latest.current });
      if (out?.status && out.status !== 'ok') { setStatus(''); setProblem(STATUS_TEXT[out.status] || 'Could not save.'); } else setStatus('saved');
    } catch (e) {
      setStatus(''); setProblem(e.message);
    }
  }, [act, position]);

  const schedule = (next, delay) => {
    latest.current = next;
    setAnswers(next);
    setStatus('');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; send(); }, delay);
  };
  const flush = async () => {
    if (!timer.current) return;
    clearTimeout(timer.current); timer.current = null;
    await send();
  };
  // Leaving the page with an edit waiting: send it.
  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; act('case_draft', { position, answers: latest.current }).catch(() => {}); }
  }, [act, position]);

  // A teammate's newer draft: take it, field by field, unless we are typing or about to send.
  const draft = current.draft;
  useEffect(() => {
    const at = draft?.updated_at || null;
    if (at === seen.current) return;
    seen.current = at;
    if (!draft || timer.current || draft.updated_by === myId) return;
    const incoming = fromDraft(draft, n);
    const merged = latest.current.map((mine, i) => (focused.current === i ? mine : incoming[i]));
    latest.current = merged;
    setAnswers(merged);
  }, [draft, myId, n]);

  const setField = (i, patch, delay) => schedule(answers.map((a, j) => (j === i ? { ...a, ...patch } : a)), delay);

  const submit = async () => {
    const ok = await confirm({
      title: 'Submit this case?', message: "Submit this case for your team? You can't change it afterwards.", confirmLabel: 'Submit',
    });
    if (!ok) return;
    setSubmitting(true); setProblem('');
    try {
      await flush();
      const out = await act('case_submit', { position });
      if (out?.status && out.status !== 'ok') setProblem(STATUS_TEXT[out.status] || 'Could not submit.');
    } catch (e) {
      setProblem(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const editor = draft?.updated_by && draft.updated_by !== myId && Date.now() - Date.parse(draft.updated_at) < RECENT_MS
    ? (team?.members || []).find((m) => m.user_id === draft.updated_by)?.shown || 'A teammate' : null;

  return (
    <>
      {element}
      <div className="live-q-top">
        <span>Case {Math.min(done + 1, total)} of {total}</span>
        <span className="live-case-state" role="status">
          {editor ? `${editor} is editing…` : status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
        </span>
      </div>
      <div className="live-card live-case-scenario"><p>{current.scenario}</p></div>
      {current.questions.map((q, i) => (
        <section key={i} className="live-card live-case-q" aria-label={`Question ${i + 1}`}>
          <p className="live-qtext">{i + 1}. {q.q} <span className="live-muted">({q.max} marks)</span></p>
          {q.kind === 'options' ? (
            <div className="live-options" style={{ marginTop: 0 }} role="group" aria-label={`Options for question ${i + 1}`}>
              {q.options.map((o, k) => (
                <button key={k} type="button" aria-pressed={answers[i].choice === k}
                        className={`live-opt c${k % 4} live-case-opt${answers[i].choice === k ? ' is-chosen' : ''}`}
                        onClick={() => setField(i, { choice: answers[i].choice === k ? null : k }, CHOICE_DELAY)}>
                  <b>{LETTERS[k]}</b><span>{o}</span>
                </button>
              ))}
            </div>
          ) : null}
          <label className="live-case-label">
            <span>{q.kind === 'options' ? 'Explain (optional)' : 'Your answer'}</span>
            <textarea className="live-case-text" rows={q.kind === 'options' ? 3 : 6} maxLength={4000} value={answers[i].text}
                      onFocus={() => { focused.current = i; }} onBlur={() => { if (focused.current === i) focused.current = -1; }}
                      onChange={(e) => setField(i, { text: e.target.value }, TEXT_DELAY)} />
          </label>
        </section>
      ))}
      {problem ? <p className="form-error" role="alert">{problem}</p> : null}
      <button type="button" className="btn primary block" disabled={submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit this case'}</button>
    </>
  );
}

function Marks({ mark, max, comment }) {
  return (
    <p className="live-case-mark">
      <b>{mark == null ? 'Not marked' : `${mark} / ${max}`}</b>
      {comment ? <span> · Teacher: {comment}</span> : null}
    </p>
  );
}

/** After release: the team's total and every case with answers, marks and comments. */
function Review({ view }) {
  return (
    <>
      <div className="live-card">
        <h1>Your team: {view.totals?.marks ?? 0} / {view.totals?.max ?? 0}</h1>
        <p className="live-muted">Marks from your teacher.</p>
      </div>
      {(view.review || []).map((c, ci) => (
        <section key={c.position} className="live-card live-case-q" aria-label={`Case ${ci + 1}`}>
          <h2 style={{ fontSize: 'var(--t-18)' }}>Case {ci + 1}</h2>
          <p className="live-case-scenario">{c.scenario}</p>
          {!c.submitted ? <p className="live-muted">Your team did not submit this case.</p> : null}
          {c.questions.map((q, qi) => {
            const a = c.answers?.[qi];
            const m = c.marks?.[qi];
            const right = q.kind === 'options' && a?.choice != null ? a.choice === q.answer : null;
            return (
              <div key={qi} className="live-case-review">
                <p className="live-qtext">{qi + 1}. {q.q}</p>
                {q.kind === 'options' ? (
                  <div className="live-options" style={{ marginTop: 0 }}>
                    {q.options.map((o, k) => (
                      <div key={k} className={`live-opt c${k % 4} static${k === q.answer ? ' is-correct' : ''}${a?.choice === k && k !== q.answer ? ' is-wrong' : ''}${a?.choice === k ? ' is-chosen' : ''}`}>
                        <b>{LETTERS[k]}</b><span>{o}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {q.kind === 'options'
                  ? <p>{a?.choice != null ? `Your team chose ${LETTERS[a.choice]}: ${right ? '✓ right' : `✗ wrong. The right answer is ${LETTERS[q.answer]}.`}` : `Your team chose no option. The right answer is ${LETTERS[q.answer]}.`}</p>
                  : null}
                {a?.text ? <p className="live-case-answer">{a.text}</p> : <p className="live-muted">{q.kind === 'open' ? 'No written answer.' : 'No explanation written.'}</p>}
                <Marks mark={m?.mark} max={q.max} comment={m?.comment} />
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}

/** A student's phone in a case room, once the teacher has started. */
export default function CasePlay({ roomId, version, act, myId, team }) {
  const { cases: view, error } = useCaseView(roomId, version);

  if (!view) {
    return error
      ? <div className="live-card"><p className="form-error" role="alert">{error.message}</p></div>
      : <div className="live-card"><p className="live-muted">Loading…</p></div>;
  }

  const header = team ? <div className="live-team-bar"><b>{team.name}</b></div> : null;
  let body;
  if (view.released) body = <Review view={view} />;
  else if (view.team === null) body = <div className="live-card"><p>Waiting for the teacher to put you in a team.</p></div>;
  else if (view.current) {
    body = <CaseForm key={view.current.position} current={view.current} act={act} myId={myId} team={team} total={view.total} done={view.done ?? 0} />;
  } else if (view.stage === 'cases' && view.done >= view.total) {
    body = <div className="live-card"><h1>Done</h1><p>Your team has finished all cases. Waiting for the teacher's marks.</p></div>;
  } else body = <div className="live-card"><p>Waiting for the teacher…</p></div>;

  return (
    <>
      {header}
      {body}
      {error ? <p className="form-error" role="alert">Could not refresh: {error.message}</p> : null}
    </>
  );
}
