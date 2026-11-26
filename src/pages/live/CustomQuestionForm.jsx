import { useState } from 'react';
import '../../styles/live-teach.css';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

/* Form for one of the teacher's own questions. `initial` is a custom item
   from quizData.js (or null for a new one); onSave gets the edited fields. */
export default function CustomQuestionForm({ initial, onSave, onCancel }) {
  const [q, setQ] = useState(initial?.q || '');
  const [options, setOptions] = useState(initial?.options?.length ? initial.options : ['', '']);
  const [answer, setAnswer] = useState(initial?.answer ?? 0);
  const [explanation, setExplanation] = useState(initial?.explanation || '');
  const [share, setShare] = useState(!!initial?.share);

  const setOption = (i, v) => setOptions((o) => o.map((x, j) => (j === i ? v : x)));
  const addOption = () => setOptions((o) => (o.length < MAX_OPTIONS ? [...o, ''] : o));
  const removeOption = (i) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((o) => o.filter((_, j) => j !== i));
    setAnswer((a) => (a === i ? 0 : a > i ? a - 1 : a));
  };

  const problem = !q.trim() ? 'Write the question.'
    : options.some((o) => !o.trim()) ? 'Fill in every option, or remove the empty ones.'
      : '';

  const submit = (e) => {
    e.preventDefault();
    if (problem) return;
    onSave({ q: q.trim(), options: options.map((o) => o.trim()), answer, explanation: explanation.trim(), share });
  };

  return (
    <form className="lt-card" onSubmit={submit}>
      <h3>{initial ? 'Edit your question' : 'Add your own question'}</h3>
      <label className="lt-field">
        <span>Question</span>
        <textarea className="lt-input" rows={3} maxLength={1000} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="lt-label" style={{ marginBottom: 8 }}>Options (select the correct one)</legend>
        {options.map((o, i) => (
          <div key={i} className="lt-opt-edit">
            <input type="radio" name="correct" checked={answer === i} onChange={() => setAnswer(i)}
                   aria-label={`Option ${i + 1} is correct`} />
            <input className="lt-input" value={o} maxLength={500} onChange={(e) => setOption(i, e.target.value)}
                   aria-label={`Option ${i + 1}`} />
            <button type="button" className="btn sm" onClick={() => removeOption(i)}
                    disabled={options.length <= MIN_OPTIONS} aria-label={`Remove option ${i + 1}`}>Remove</button>
          </div>
        ))}
      </fieldset>
      <button type="button" className="btn sm" onClick={addOption} disabled={options.length >= MAX_OPTIONS}>Add option</button>
      <label className="lt-field" style={{ marginTop: 14 }}>
        <span>Explanation (optional)</span>
        <textarea className="lt-input" rows={2} maxLength={2000} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      </label>
      <label className="lt-check">
        <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
        <span>Let Labobo add this question to the question bank (after review)</span>
      </label>
      {problem ? <p className="lt-muted">{problem}</p> : null}
      <div className="lt-controls" style={{ marginTop: 12 }}>
        <button type="submit" className="btn primary sm" disabled={!!problem}>{initial ? 'Update question' : 'Add to quiz'}</button>
        <button type="button" className="btn sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
