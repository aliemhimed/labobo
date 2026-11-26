import { useEffect, useState } from 'react';
import { useCaseView } from '../../lib/live.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** One team's mark and comment for one question. Saved on blur or with the button. */
function MarkBox({ position, team, qIndex, max, saved, act }) {
  const serverMark = saved?.mark ?? null;
  const serverComment = saved?.comment || '';
  const [mark, setMark] = useState(serverMark == null ? '' : String(serverMark));
  const [comment, setComment] = useState(serverComment);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState(''); // '' | 'saving' | 'saved' | error text
  const [failed, setFailed] = useState(false);

  // Take the server's values unless the teacher is in the middle of an edit.
  useEffect(() => {
    if (dirty) return;
    setMark(serverMark == null ? '' : String(serverMark));
    setComment(serverComment);
  }, [serverMark, serverComment, dirty]);

  const save = async () => {
    if (!dirty) return;
    const n = mark.trim() === '' ? null : Number(mark);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > max)) {
      setFailed(true); setState(`Marks go from 0 to ${max}.`);
      return;
    }
    setState('saving'); setFailed(false);
    try {
      const out = await act('case_mark', { position, team: team.no, question: qIndex, mark: n, comment: comment.trim() });
      if (out?.status && out.status !== 'ok') {
        setFailed(true);
        setState(out.status === 'not_submitted' ? 'That team has not submitted this case yet.' : 'Could not save this mark.');
        return;
      }
      setDirty(false); setState('saved');
    } catch (e) {
      setFailed(true); setState(e.message);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
      <div className="lt-controls">
        <label className="lt-field" style={{ marginBottom: 0, maxWidth: 140 }}>
          <span>Mark (0 to {max})</span>
          <input className="lt-input" type="number" min={0} max={max} step={1} value={mark}
                 onChange={(e) => { setMark(e.target.value); setDirty(true); setState(''); }} onBlur={save} />
        </label>
      </div>
      <label className="lt-field" style={{ marginBottom: 0 }}>
        <span>Comment (optional)</span>
        <textarea className="lt-input" rows={2} maxLength={1000} value={comment}
                  onChange={(e) => { setComment(e.target.value); setDirty(true); setState(''); }} onBlur={save} />
      </label>
      <div className="lt-controls">
        <button type="button" className="btn sm" disabled={!dirty || state === 'saving'} onClick={save}>Save mark</button>
        {state === 'saving' ? <span className="lt-muted" role="status">Saving…</span> : null}
        {state === 'saved' && !dirty ? <span className="lt-ok" role="status">Saved</span> : null}
        {failed ? <span className="lt-error" role="alert">{state}</span> : null}
      </div>
    </div>
  );
}

function Progress({ teams, total }) {
  return (
    <section className="lt-card" aria-labelledby="lt-case-progress">
      <h2 id="lt-case-progress" style={{ fontSize: 'var(--t-21)', marginBottom: 10 }}>Progress</h2>
      <div className="lt-table-wrap">
        <table className="lt-table">
          <thead><tr><th>Team</th><th>Cases</th><th>Marks so far</th></tr></thead>
          <tbody>
            {teams.map((t) => {
              const finished = t.done >= total;
              return (
                <tr key={t.no}>
                  <td>{t.name}</td>
                  <td>
                    {finished ? <span aria-label="Finished">✓ Finished</span> : `Case ${Math.min(t.done + 1, total)} of ${total}`}
                    <div className="lt-bar" style={{ marginTop: 4, minWidth: 100 }} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={t.done}>
                      <i style={{ width: `${total ? Math.min(100, (t.done / total) * 100) : 0}%` }} />
                    </div>
                  </td>
                  <td className="num">{t.totals?.marks ?? 0} / {t.totals?.max ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Marking({ view, act }) {
  const { cases = [], teams = [] } = view;
  const [ci, setCi] = useState(0);
  const [qi, setQi] = useState(0);
  const c = cases[Math.min(ci, cases.length - 1)];
  if (!c) return null;
  const qIndex = Math.min(qi, c.questions.length - 1);
  const q = c.questions[qIndex];
  const submittedCount = teams.filter((t) => t.answers?.find((a) => a.position === c.position)?.submitted).length;

  return (
    <section className="lt-card" aria-labelledby="lt-case-marking" style={{ display: 'grid', gap: 14 }}>
      <h2 id="lt-case-marking" style={{ fontSize: 'var(--t-21)' }}>Marking</h2>
      <div className="lt-controls">
        <label className="lt-field" style={{ marginBottom: 0 }}>
          <span>Case</span>
          <select className="lt-input" value={ci} onChange={(e) => { setCi(Number(e.target.value)); setQi(0); }}>
            {cases.map((x, i) => <option key={x.position} value={i}>Case {i + 1}</option>)}
          </select>
        </label>
        <label className="lt-field" style={{ marginBottom: 0 }}>
          <span>Question</span>
          <select className="lt-input" value={qIndex} onChange={(e) => setQi(Number(e.target.value))}>
            {c.questions.map((x, i) => <option key={i} value={i}>Question {i + 1}</option>)}
          </select>
        </label>
        <span className="lt-sub">{submittedCount} of {teams.length} teams submitted this case</span>
      </div>

      <div>
        <p className="lt-muted" style={{ whiteSpace: 'pre-wrap' }}>{c.scenario}</p>
        <h3 style={{ margin: '10px 0 6px' }}>{q.q} <span className="lt-muted">({q.max} marks)</span></h3>
        {q.kind === 'options' ? (
          <ul className="lt-dist">
            {q.options.map((o, i) => (
              <li key={i} className={i === q.answer ? 'right' : ''}><span>{LETTERS[i]}. {o}{i === q.answer ? ' (correct)' : ''}</span></li>
            ))}
          </ul>
        ) : <p className="lt-muted">Open answer. Mark what the team wrote.</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 20rem), 1fr))', gap: 14 }}>
        {teams.map((t) => {
          const a = t.answers?.find((x) => x.position === c.position);
          const submitted = !!a?.submitted;
          const mine = a?.answers?.[qIndex];
          const right = q.kind === 'options' && mine?.choice != null ? mine.choice === q.answer : null;
          return (
            <div key={t.no} className="lt-q" style={{ alignContent: 'start' }}>
              <div className="lt-row-title">{t.name}</div>
              {!submitted ? <p className="lt-muted">Not submitted yet</p> : (
                <>
                  {q.kind === 'options' ? (
                    <p>
                      {mine?.choice != null
                        ? <>Chose <b>{LETTERS[mine.choice]}</b>{' '}
                          <span className={right ? 'lt-ok' : 'lt-error'}>{right ? '✓ Right' : '✗ Wrong'}</span></>
                        : <span className="lt-muted">No option chosen</span>}
                    </p>
                  ) : null}
                  {mine?.text ? <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{mine.text}</p>
                    : <p className="lt-muted">{q.kind === 'open' ? 'No written answer' : 'No explanation written'}</p>}
                  <MarkBox key={`${c.position}-${t.no}-${qIndex}`} position={c.position} team={t} qIndex={qIndex} max={q.max}
                           saved={a?.marks?.[qIndex]} act={act} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The teacher's view of a running case room: progress, marking and release. */
export default function CaseHost({ roomId, version, act, busy, run, confirm }) {
  const { cases: view, error } = useCaseView(roomId, version);

  if (!view) {
    return error
      ? <p className="lt-error" role="alert">Could not load the cases: {error.message}</p>
      : <p className="lt-muted" role="status">Loading…</p>;
  }
  const teams = [...(view.teams || [])].sort((a, b) => a.no - b.no);
  const finishedTeams = teams.filter((t) => t.done >= view.total).length;

  return (
    <>
      <section className="lt-card">
        <div className="lt-controls">
          {view.released ? <b className="lt-ok" role="status">Marks released</b> : (
            <button type="button" className="btn primary" disabled={busy}
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'End and release marks?',
                        message: 'The room closes and every team sees its marks and your comments. Teams that have not submitted cannot do so afterwards.',
                        confirmLabel: 'End and release marks', danger: true,
                      });
                      if (ok) run(() => act('case_release'));
                    }}>End and release marks</button>
          )}
          <span className="lt-sub">{finishedTeams} of {teams.length} teams finished all {view.total} cases</span>
        </div>
        {error ? <p className="lt-error" role="alert" style={{ marginTop: 8 }}>Could not refresh: {error.message}</p> : null}
      </section>
      <Progress teams={teams} total={view.total} />
      <Marking view={{ ...view, teams }} act={act} />
    </>
  );
}
