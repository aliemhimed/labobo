import { useState } from 'react';
import { supaInsert } from '../lib/supabase.js';
import { useToast } from './Toast.jsx';
import Dialog from './Dialog.jsx';
import '../styles/overlays.css';

const REASONS = [
  'Wrong answer marked',
  'Typo or formatting error',
  'Outdated information',
  'Unclear or ambiguous wording',
  'Other',
];

export default function ReportModal({ question, onClose }) {
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();

  async function submit() {
    if (!selected || sending) return;
    setSending(true);
    onClose();
    // device_id is filled in server-side from the signed-in user's verified
    // session (see netlify/functions/supa-insert.js) — never sent from here.
    const saved = await supaInsert('question_reports', {
      question_id: question.id,
      question_text: question.q,
      subject: question.subject,
      topic: question.topic,
      reason: selected,
      note: note.trim() || null,
      reported_at: new Date().toISOString(),
    });
    toast(saved ? 'Report sent. Thank you, we’ll check this question.' : 'Your report wasn’t sent. Try again in a moment.');
  }

  return (
    <Dialog onClose={onClose} labelledBy="report-title">
      <h2 id="report-title">Report a problem</h2>
      <p className="dialog-text">What’s wrong with this question?</p>
      <div className="report-reasons" role="group" aria-label="What is wrong with this question?">
        {REASONS.map((r) => (
          <button type="button" key={r}
                  className={'report-reason' + (selected === r ? ' active' : '')}
                  aria-pressed={selected === r}
                  onClick={() => setSelected(r)}>
            {r}
          </button>
        ))}
      </div>
      <label htmlFor="report-note" className="field-label">Details (optional)</label>
      <textarea id="report-note" className="report-note" maxLength={500}
                placeholder="For example, which option you think is right and why"
                value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="button" className="btn primary" disabled={!selected || sending} onClick={submit}>
          Send report
        </button>
      </div>
    </Dialog>
  );
}
