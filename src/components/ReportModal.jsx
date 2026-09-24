import { useState } from 'react';
import { supaInsert } from '../lib/supabase.js';
import { useToast } from './Toast.jsx';
import Dialog from './Dialog.jsx';

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
    toast(saved ? "Thanks! We'll review this question." : "Couldn't send your report. Please try again later.");
  }

  return (
    <Dialog onClose={onClose} labelledBy="report-title"
            overlayClass="report-overlay" modalClass="report-modal">
      <h3 id="report-title">🚩 Report a problem</h3>
      <p>Help us improve — what's wrong with this question?</p>
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
      <textarea className="report-note" aria-label="Details (optional)" placeholder="Optional: add details…" maxLength={500}
                value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="report-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!selected || sending} onClick={submit}>
          Submit Report
        </button>
      </div>
    </Dialog>
  );
}
