import { useState } from 'react';
import { parsePastedQuestion } from './quizData.js';
import '../../styles/live-teach.css';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const LETTERS = 'ABCDEF';

/* Form for one of the teacher's own questions. `initial` is a custom item
   from quizData.js (or null for a new one); onSave gets the edited fields. */
export default function CustomQuestionForm({ initial, onSave, onCancel }) {
  const [q, setQ] = useState(initial?.q || '');
  const [options, setOptions] = useState(initial?.options?.length ? initial.options : ['', '', '', '']);
  const [answer, setAnswer] = useState(initial?.answer ?? 0);
  const [explanation, setExplanation] = useState(initial?.explanation || '');
  const [showExplanation, setShowExplanation] = useState(!!initial?.explanation);
  const [share, setShare] = useState(!!initial?.share);
  const [paste, setPaste] = useState(false);
  const [pasted, setPasted] = useState('');
  const [pasteError, setPasteError] = useState('');

  const setOption = (i, v) => setOptions((o) => o.map((x, j) => (j === i ? v : x)));
  const addOption = () => setOptions((o) => (o.length < MAX_OPTIONS ? [...o, ''] : o));
  const removeOption = (i) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((o) => o.filter((_, j) => j !== i));
    setAnswer((a) => (a === i ? 0 : a > i ? a - 1 : a));
  };

  const onPaste = (text) => {
    setPasted(text);
    if (!text.trim()) { setPasteError(''); return; }
    const res = parsePastedQuestion(text);
    if (res.error) { setPasteError(res.error); return; }
    setPasteError('');
    setQ(res.q);
    setOptions(res.options);
    setAnswer(res.answer);
  };

  const filled = options.map((o, i) => ({ text: o.trim(), i })).filter((o) => o.text);
  const problem = !q.trim() ? 'Write the question.'
    : filled.length < MIN_OPTIONS ? 'Write at least two options.'
      : !filled.some((o) => o.i === answer) ? 'Mark the correct option, and make sure it is not empty.'
        : '';

  const submit = (e) => {
    e.preventDefault();
    if (problem) return;
    onSave({
      q: q.trim(), options: filled.map((o) => o.text), answer: filled.findIndex((o) => o.i === answer),
      explanation: explanation.trim(), share,
    });
  };

  return (
    <form className="lt-card" onSubmit={submit}>
      <h3>{initial ? 'Edit your question' : 'Add your own question'}</h3>
      <div className="lt-controls" style={{ margin: '8px 0 14px' }}>
        <button type="button" className="btn sm" aria-pressed={paste} onClick={() => setPaste((p) => !p)}>
          {paste ? 'Type it instead' : 'Paste a question'}
        </button>
      </div>
      {paste ? (
        <label className="lt-field">
          <span>Paste the question with its options</span>
          <textarea className="lt-input" rows={6} value={pasted} onChange={(e) => onPaste(e.target.value)}
                    placeholder={'Which enzyme class transfers groups?\nA) Oxidoreductases\nB) Transferases *\nC) Hydrolases\nD) Lyases'} />
          <em className="lt-muted" style={{ fontStyle: 'normal' }}>Mark the correct option with * at the end, or finish with a line like "Answer: B".</em>
          {pasteError ? <span className="lt-error" role="alert">{pasteError}</span>
            : pasted.trim() ? <span className="lt-ok" role="status">Found it. Check the fields below.</span> : null}
        </label>
      ) : null}
      <label className="lt-field">
        <span>Question</span>
        <textarea className="lt-input" rows={3} maxLength={1000} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="lt-label" style={{ marginBottom: 8 }}>Options (select the correct one on the left)</legend>
        {options.map((o, i) => (
          <div key={i} className="lt-opt-edit">
            <input type="radio" name="correct" checked={answer === i} onChange={() => setAnswer(i)}
                   aria-label={`Option ${LETTERS[i]} is correct`} />
            <input className="lt-input" value={o} maxLength={500} onChange={(e) => setOption(i, e.target.value)}
                   placeholder={`Option ${LETTERS[i]}`} aria-label={`Option ${LETTERS[i]}`} />
            {i >= MIN_OPTIONS ? (
              <button type="button" className="btn sm" onClick={() => removeOption(i)} aria-label={`Remove option ${LETTERS[i]}`}>Remove</button>
            ) : null}
          </div>
        ))}
      </fieldset>
      <div className="lt-controls">
        <button type="button" className="btn sm" onClick={addOption} disabled={options.length >= MAX_OPTIONS}>+ Add option</button>
        {!showExplanation ? <button type="button" className="btn sm" onClick={() => setShowExplanation(true)}>+ Add explanation</button> : null}
      </div>
      {showExplanation ? (
        <label className="lt-field" style={{ marginTop: 14 }}>
          <span>Explanation (optional)</span>
          <textarea className="lt-input" rows={2} maxLength={2000} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </label>
      ) : null}
      <label className="lt-check">
        <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
        <span>Let Labobo add this question to the question bank (after review)</span>
      </label>
      {problem ? <p className="lt-muted">{problem}</p> : null}
      <div className="lt-controls" style={{ marginTop: 12 }}>
        <button type="submit" className="btn primary sm" disabled={!!problem}>{initial ? 'Update question' : 'Add question'}</button>
        <button type="button" className="btn sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
