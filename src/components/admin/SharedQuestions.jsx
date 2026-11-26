import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveShared, fetchBankTopics, fetchSharedQuestions, rejectShared } from '../../lib/adminApi.js';
import { bankGroups, tableLabelMap } from '../../lib/liveSubjects.js';
import { SUBJECTS } from '../../lib/subjects.js';
import { useConfirm } from '../Confirm.jsx';
import { Panel } from './parts.jsx';

const KEY = ['admin-shared-questions'];
const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/* Display name of a raw topic value: tables with a topicMap store slugs. */
function topicName(table, topic) {
  for (const entry of Object.values(SUBJECTS)) {
    if (entry.topicMap && (entry.sources || []).some((s) => s.table === table)) return entry.topicMap[topic] || topic;
  }
  return topic;
}

function SharedQuestion({ item, onDone, confirm }) {
  const qc = useQueryClient();
  const [table, setTable] = useState('');
  const [topic, setTopic] = useState('');
  const [done, setDone] = useState('');
  const labels = tableLabelMap();

  const topics = useQuery({
    queryKey: ['admin-bank-topics', table],
    queryFn: ({ signal }) => fetchBankTopics(table, signal),
    enabled: !!table,
    staleTime: 60_000,
  });

  const finish = (msg) => {
    setDone(msg);
    onDone(item.id, msg);
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ['admin-log'] });
  };
  const approve = useMutation({
    mutationFn: () => approveShared(item.id, table, topic),
    onSuccess: () => finish(`Added to ${labels.get(table) || table} — ${topicName(table, topic)}`),
  });
  const reject = useMutation({
    mutationFn: () => rejectShared(item.id),
    onSuccess: () => finish('Rejected.'),
  });
  const busy = approve.isPending || reject.isPending;
  const error = approve.error || reject.error;

  return (
    <div className="adm-shared">
      <p className="adm-shared-q">{item.q}</p>
      <ol className="adm-shared-opts" type="A">
        {(item.options || []).map((o, i) => (
          <li key={i} className={i === item.answer ? 'right' : ''}>
            {o}{i === item.answer ? <strong> ✓ correct</strong> : null}
          </li>
        ))}
      </ol>
      {item.explanation ? <p className="adm-foot"><b>Explanation:</b> {item.explanation}</p> : null}
      <p className="adm-foot">From {item.teacher}{item.created_at ? ` · ${day(item.created_at)}` : ''}</p>
      {done ? <p className="adm-ok" role="status">{done}</p> : (
        <>
          <div className="adm-shared-pick">
            <label className="adm-field">
              <span>Subject</span>
              <select className="adm-input" value={table} onChange={(e) => { setTable(e.target.value); setTopic(''); }}>
                <option value="">Choose a subject…</option>
                {bankGroups().map((g) => (
                  <optgroup key={g.title} label={g.title}>
                    {g.tables.map((t) => <option key={t.table} value={t.table}>{t.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            {table ? (
              <label className="adm-field">
                <span>Lecture</span>
                <select className="adm-input" value={topic} onChange={(e) => setTopic(e.target.value)} disabled={topics.isLoading}>
                  <option value="">{topics.isLoading ? 'Loading lectures…' : 'Choose a lecture…'}</option>
                  {(topics.data?.topics || []).map((t) => <option key={t} value={t}>{topicName(table, t)}</option>)}
                </select>
              </label>
            ) : null}
          </div>
          {topics.isError ? (
            <p className="adm-error" role="alert">Couldn't load lectures: {topics.error.message}{' '}
              <button type="button" className="btn sm" onClick={() => topics.refetch()}>Try again</button></p>
          ) : null}
          {error ? <p className="adm-error" role="alert">{error.message}</p> : null}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn primary sm" disabled={!table || !topic || busy} onClick={() => approve.mutate()}>
              {approve.isPending ? 'Adding…' : 'Add to bank'}
            </button>
            <button type="button" className="btn sm" disabled={busy}
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Reject this question?', message: 'It will not be added to the bank. The teacher keeps their own copy.',
                        confirmLabel: 'Reject', danger: true,
                      });
                      if (ok) reject.mutate();
                    }}>
              {reject.isPending ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SharedQuestions() {
  const { confirm, element: confirmElement } = useConfirm();
  // Handled questions stay on screen (with their result line) until the next load.
  const [handled, setHandled] = useState({});
  const { data, error, isLoading, refetch } = useQuery({ queryKey: KEY, queryFn: ({ signal }) => fetchSharedQuestions(signal) });
  const list = (data?.questions || []).filter((q) => !handled[q.id]);
  const finished = Object.entries(handled);
  const waiting = list.length;

  return (
    <Panel title="Questions teachers shared" note={isLoading || error ? '' : `${waiting}`} wide>
      {confirmElement}
      {isLoading ? <p className="adm-empty">Loading…</p> : error ? (
        <p className="adm-error">Couldn't load shared questions: {error.message}{' '}
          <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
      ) : (
        <>
          {finished.map(([id, msg]) => <p key={id} className="adm-ok" role="status">{msg}</p>)}
          {waiting === 0 ? <p className="adm-empty">No questions waiting.</p> : list.map((q) => (
            <SharedQuestion key={q.id} item={q} confirm={confirm}
                            onDone={(id, msg) => setHandled((h) => ({ ...h, [id]: msg }))} />
          ))}
        </>
      )}
    </Panel>
  );
}
