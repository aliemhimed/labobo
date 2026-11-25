import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchErrors } from '../../lib/adminApi.js';
import { Panel, ago } from './parts.jsx';

const KIND = { error: 'Error', rejection: 'Failed promise', render: 'Page crashed' };

/* Crashes students hit in their browsers over the last two weeks, one row
   per kind of crash (src/lib/errorReport.js → /api/client-error). */
export default function ErrorsTab() {
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-errors'], queryFn: ({ signal }) => fetchErrors(signal) });
  const [open, setOpen] = useState(null);

  if (isLoading) return <p className="adm-empty">Loading…</p>;
  if (error) {
    return (
      <p className="adm-error">Couldn't load errors: {error.message}{' '}
        <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
    );
  }
  const groups = data?.groups || [];
  return (
    <div className="adm-grid">
      <Panel title="Errors students hit" note={`last 14 days · ${data?.total || 0} reports`} wide>
        {!groups.length ? <p className="adm-empty">No errors reported. 🎉</p> : (
          <ul className="adm-reports">
            {groups.map((g) => (
              <li key={g.fingerprint}>
                <p className="adm-review-head">
                  <b>{g.count}×</b> <span className="adm-sub">{KIND[g.sample.kind] || g.sample.kind} · {g.users} student{g.users === 1 ? '' : 's'}</span>
                </p>
                <p className="adm-review-body"><code>{g.sample.message}</code></p>
                <div className="adm-report-foot">
                  <span className="adm-sub">
                    last {ago(g.last)} · first {ago(g.first)}{g.sample.url ? ` · ${g.sample.url}` : ''}
                  </span>
                  <span className="adm-actions">
                    <button type="button" className="btn sm" onClick={() => setOpen(open === g.fingerprint ? null : g.fingerprint)}>
                      {open === g.fingerprint ? 'Hide details' : 'Details'}
                    </button>
                  </span>
                </div>
                {open === g.fingerprint ? (
                  <pre className="adm-stack">{[g.sample.user_agent, g.sample.release && `release ${g.sample.release}`, g.sample.stack].filter(Boolean).join('\n\n')}</pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
