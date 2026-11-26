import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import PageHead from '../../components/PageHead.jsx';
import { fetchCaseSet, saveCaseSet } from '../../lib/live.js';
import TeacherGate from './TeacherGate.jsx';
import { parsePastedQuestion } from './quizData.js';
import '../../styles/live-teach.css';

const LETTERS = 'ABCDEF';
const MAX_CASES = 50;
const MAX_QUESTIONS = 6;

let keyCounter = 0;
const nextKey = () => `k${++keyCounter}`;

const newQuestion = () => ({ _k: nextKey(), kind: 'options', q: '', options: ['', '', '', ''], answer: 0, max: 5 });
const newCase = () => ({ _k: nextKey(), scenario: '', questions: [newQuestion()] });

function fromServer(cases) {
  return (cases || []).map((c) => ({
    _k: nextKey(), scenario: c.scenario || '',
    questions: (c.questions || []).map((q) => (q.kind === 'open'
      ? { _k: nextKey(), kind: 'open', q: q.q || '', options: ['', '', '', ''], answer: 0, max: q.max || 5 }
      : { _k: nextKey(), kind: 'options', q: q.q || '', options: q.options?.length ? [...q.options] : ['', '', '', ''], answer: q.answer ?? 0, max: q.max || 5 })),
  }));
}

/** The cases as the server wants them: empty options dropped, the correct index kept in step. */
function toServer(cases) {
  return cases.map((c) => ({
    scenario: c.scenario.trim(),
    questions: c.questions.map((q) => {
      const max = Math.max(1, Math.min(100, Math.round(Number(q.max)) || 5));
      if (q.kind === 'open') return { kind: 'open', q: q.q.trim(), max };
      const filled = q.options.map((o, i) => ({ text: o.trim(), i })).filter((o) => o.text);
      return { kind: 'options', q: q.q.trim(), options: filled.map((o) => o.text), answer: filled.findIndex((o) => o.i === q.answer), max };
    }),
  }));
}

function problemWith(title, cases) {
  if (!title.trim()) return 'Give the case set a title.';
  for (const [ci, c] of cases.entries()) {
    if (!c.scenario.trim()) return `Case ${ci + 1} needs a scenario.`;
    for (const [qi, q] of c.questions.entries()) {
      const where = `Case ${ci + 1}, question ${qi + 1}`;
      if (!q.q.trim()) return `${where} needs its text.`;
      if (q.kind === 'options') {
        const filled = q.options.map((o, i) => ({ text: o.trim(), i })).filter((o) => o.text);
        if (filled.length < 2) return `${where} needs at least two options.`;
        if (!filled.some((o) => o.i === q.answer)) return `${where}: mark the correct option, and make sure it is not empty.`;
      }
    }
  }
  return '';
}

const move = (list, i, d) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

function QuestionEditor({ n, q, onChange, onMove, onRemove, canUp, canDown, canRemove }) {
  const [paste, setPaste] = useState(false);
  const [pasted, setPasted] = useState('');
  const [pasteError, setPasteError] = useState('');
  const set = (patch) => onChange({ ...q, ...patch });
  const setOption = (i, v) => set({ options: q.options.map((x, j) => (j === i ? v : x)) });
  const addOption = () => { if (q.options.length < 6) set({ options: [...q.options, ''] }); };
  const removeOption = (i) => {
    if (q.options.length <= 2) return;
    set({ options: q.options.filter((_, j) => j !== i), answer: q.answer === i ? 0 : q.answer > i ? q.answer - 1 : q.answer });
  };
  const onPaste = (text) => {
    setPasted(text);
    if (!text.trim()) { setPasteError(''); return; }
    const res = parsePastedQuestion(text);
    if (res.error) { setPasteError(res.error); return; }
    setPasteError('');
    set({ kind: 'options', q: res.q, options: res.options, answer: res.answer });
  };
  const radio = `correct-${q._k}`;

  return (
    <div className="lt-q" style={{ gap: 12 }}>
      <div className="lt-q-top" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <b>Question {n}</b>
        <div className="lt-tools">
          <button type="button" disabled={!canUp} onClick={() => onMove(-1)} aria-label={`Move question ${n} up`}>↑</button>
          <button type="button" disabled={!canDown} onClick={() => onMove(1)} aria-label={`Move question ${n} down`}>↓</button>
          <button type="button" disabled={!canRemove} onClick={onRemove} aria-label={`Remove question ${n}`}>×</button>
        </div>
      </div>
      <div className="lt-seg" role="group" aria-label={`Type of question ${n}`}>
        <button type="button" aria-pressed={q.kind === 'options'} onClick={() => set({ kind: 'options' })}>With options</button>
        <button type="button" aria-pressed={q.kind === 'open'} onClick={() => set({ kind: 'open' })}>Open answer</button>
      </div>
      {q.kind === 'options' ? (
        <div className="lt-controls">
          <button type="button" className="btn sm" aria-pressed={paste} onClick={() => setPaste((p) => !p)}>{paste ? 'Type it instead' : 'Paste a question'}</button>
        </div>
      ) : null}
      {paste && q.kind === 'options' ? (
        <label className="lt-field" style={{ marginBottom: 0 }}>
          <span>Paste the question with its options</span>
          <textarea className="lt-input" rows={5} value={pasted} onChange={(e) => onPaste(e.target.value)}
                    placeholder={'Which enzyme class transfers groups?\nA) Oxidoreductases\nB) Transferases *\nC) Hydrolases\nD) Lyases'} />
          <em className="lt-muted" style={{ fontStyle: 'normal' }}>Mark the correct option with * at the end, or finish with a line like "Answer: B".</em>
          {pasteError ? <span className="lt-error" role="alert">{pasteError}</span>
            : pasted.trim() ? <span className="lt-ok" role="status">Found it. Check the fields below.</span> : null}
        </label>
      ) : null}
      <label className="lt-field" style={{ marginBottom: 0 }}>
        <span>Question</span>
        <textarea className="lt-input" rows={2} maxLength={2000} value={q.q} onChange={(e) => set({ q: e.target.value })} />
      </label>
      {q.kind === 'options' ? (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lt-label" style={{ marginBottom: 8 }}>Options (select the correct one on the left)</legend>
          {q.options.map((o, i) => (
            <div key={i} className="lt-opt-edit">
              <input type="radio" name={radio} checked={q.answer === i} onChange={() => set({ answer: i })} aria-label={`Option ${LETTERS[i]} is correct`} />
              <input className="lt-input" value={o} maxLength={500} onChange={(e) => setOption(i, e.target.value)}
                     placeholder={`Option ${LETTERS[i]}`} aria-label={`Option ${LETTERS[i]}`} />
              {i >= 2 ? <button type="button" className="btn sm" onClick={() => removeOption(i)} aria-label={`Remove option ${LETTERS[i]}`}>Remove</button> : null}
            </div>
          ))}
          <button type="button" className="btn sm" onClick={addOption} disabled={q.options.length >= 6}>+ Add option</button>
        </fieldset>
      ) : <p className="lt-muted">The team writes its answer. You mark it.</p>}
      <label className="lt-field" style={{ marginBottom: 0, maxWidth: 160 }}>
        <span>Max marks</span>
        <input className="lt-input" type="number" min={1} max={100} step={1} value={q.max}
               onChange={(e) => set({ max: e.target.value === '' ? '' : Number(e.target.value) })} />
      </label>
    </div>
  );
}

function Editor({ id, initial }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState(initial?.title || '');
  const [cases, setCases] = useState(() => (initial?.cases?.length ? fromServer(initial.cases) : [newCase()]));
  const [shown, setShown] = useState(false);

  const save = useMutation({
    mutationFn: () => saveCaseSet({ id, title: title.trim(), subject: '', cases: toServer(cases) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['live-case-sets'] }); navigate('/live/teach'); },
  });
  const problem = problemWith(title, cases);

  const setCase = (ci, patch) => setCases((l) => l.map((c, i) => (i === ci ? { ...c, ...patch } : c)));
  const setQuestion = (ci, qi, q) => setCases((l) => l.map((c, i) => (i === ci ? { ...c, questions: c.questions.map((x, j) => (j === qi ? q : x)) } : c)));

  return (
    <main id="main" tabIndex={-1} className="lt">
      <PageHead title={id ? 'Edit case set' : 'New case set'} backLabel="Teacher home" onBack={() => navigate('/live/teach')} />
      <form onSubmit={(e) => { e.preventDefault(); setShown(true); if (!problem) save.mutate(); }} style={{ display: 'grid', gap: 18, maxWidth: '52rem' }}>
        <label className="lt-field" style={{ marginBottom: 0 }}>
          <span>Title</span>
          <input className="lt-input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </label>

        {cases.map((c, ci) => (
          <section key={c._k} className="lt-card" aria-label={`Case ${ci + 1}`} style={{ display: 'grid', gap: 14 }}>
            <div className="lt-q-top" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 'var(--t-21)' }}>Case {ci + 1}</h2>
              <div className="lt-tools">
                <button type="button" disabled={ci === 0} onClick={() => setCases((l) => move(l, ci, -1))} aria-label={`Move case ${ci + 1} up`}>↑</button>
                <button type="button" disabled={ci === cases.length - 1} onClick={() => setCases((l) => move(l, ci, 1))} aria-label={`Move case ${ci + 1} down`}>↓</button>
                <button type="button" disabled={cases.length <= 1} onClick={() => setCases((l) => l.filter((_, i) => i !== ci))} aria-label={`Remove case ${ci + 1}`}>×</button>
              </div>
            </div>
            <label className="lt-field" style={{ marginBottom: 0 }}>
              <span>Scenario</span>
              <textarea className="lt-input" rows={5} maxLength={5000} value={c.scenario} onChange={(e) => setCase(ci, { scenario: e.target.value })} />
            </label>
            {c.questions.map((q, qi) => (
              <QuestionEditor key={q._k} n={qi + 1} q={q}
                              onChange={(next) => setQuestion(ci, qi, next)}
                              onMove={(d) => setCase(ci, { questions: move(c.questions, qi, d) })}
                              onRemove={() => setCase(ci, { questions: c.questions.filter((_, j) => j !== qi) })}
                              canUp={qi > 0} canDown={qi < c.questions.length - 1} canRemove={c.questions.length > 1} />
            ))}
            <div className="lt-controls">
              <button type="button" className="btn sm" disabled={c.questions.length >= MAX_QUESTIONS}
                      onClick={() => setCase(ci, { questions: [...c.questions, newQuestion()] })}>+ Add another question</button>
            </div>
          </section>
        ))}

        <div className="lt-controls">
          <button type="button" className="btn" disabled={cases.length >= MAX_CASES} onClick={() => setCases((l) => [...l, newCase()])}>+ Add another case</button>
        </div>

        {shown && problem ? <p className="lt-error" role="alert">{problem}</p> : null}
        {save.isError ? <p className="lt-error" role="alert">{save.error.message}</p> : null}
        <div className="lt-controls">
          <button type="submit" className="btn primary lg" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save case set'}</button>
          <Link className="btn" to="/live/teach">Cancel</Link>
        </div>
      </form>
    </main>
  );
}

export default function CaseSetBuilder() {
  const { id } = useParams();
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['live-case-set', id], queryFn: () => fetchCaseSet(id), enabled: !!id, gcTime: 0,
  });

  let body;
  if (id && isLoading) body = <div className="splash" role="status">Loading</div>;
  else if (id && error) {
    body = (
      <main id="main" tabIndex={-1} className="lt">
        <div className="lt-state" role="alert">
          <h1>Could not load this case set</h1>
          <p className="lt-sub">{error.message}</p>
          <button type="button" className="btn primary" onClick={() => refetch()}>Try again</button>
          <Link className="btn" to="/live/teach">Back</Link>
        </div>
      </main>
    );
  } else body = <Editor key={id || 'new'} id={id} initial={data?.set} />;

  return (
    <TeacherGate>
      <TopBar subtitle="Live" />
      {body}
    </TeacherGate>
  );
}
