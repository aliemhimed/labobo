import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAnnouncement, endAnnouncement, fetchAnnouncements } from '../../lib/adminApi.js';
import { useConfirm } from '../Confirm.jsx';
import { Panel, Table, ago } from './parts.jsx';

const KEY = ['admin-announcements'];
const TONES = { info: 'Announcement', warning: 'Heads up', success: 'Good news' };
const AUDIENCE = { '': 'Everyone', 1: 'Semester 1', 2: 'Semester 2' };
const MAX = 500;

const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

/* What students will see: the same markup as AnnouncementBanner. */
function Preview({ message, tone }) {
  return (
    <div className="announcements adm-preview">
      <div className={`announcement ${tone}`}>
        <p><b>{TONES[tone]}</b>{message || 'Your message will appear here.'}</p>
      </div>
    </div>
  );
}

function Composer() {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [semester, setSemester] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const post = useMutation({
    mutationFn: () => createAnnouncement({
      message: message.trim(), tone, semester: semester || null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    }),
    onSuccess: () => {
      setMessage(''); setEndsAt('');
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['admin-log'] });
    },
  });
  const trimmed = message.trim();

  return (
    <form className="adm-form" onSubmit={(e) => { e.preventDefault(); if (trimmed) post.mutate(); }}>
      <label className="adm-field">
        <span>Message</span>
        <textarea className="adm-input" rows={3} maxLength={MAX} value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Body Systems II questions for week 3 are up. Good luck on Thursday!" />
        <em>{MAX - message.length} characters left</em>
      </label>
      <div className="adm-filters">
        <label className="adm-field">
          <span>Style</span>
          <select className="adm-input" value={tone} onChange={(e) => setTone(e.target.value)}>
            {Object.entries(TONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Who sees it</span>
          <select className="adm-input" value={semester} onChange={(e) => setSemester(e.target.value)}>
            {Object.entries(AUDIENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Ends (optional)</span>
          <input type="datetime-local" className="adm-input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
      </div>
      <p className="adm-sub">Preview, as students will see it on their home page:</p>
      <Preview message={trimmed} tone={tone} />
      {post.isError ? <p className="adm-error" role="alert">{post.error.message}</p> : null}
      {post.isSuccess && !message ? <p className="adm-ok" role="status">Posted. Students see it within a few minutes.</p> : null}
      <div>
        <button type="submit" className="btn primary sm" disabled={!trimmed || post.isPending}>
          {post.isPending ? 'Posting…' : 'Post announcement'}
        </button>
      </div>
    </form>
  );
}

export default function AnnouncementsTab() {
  const qc = useQueryClient();
  const { confirm, element: confirmElement } = useConfirm();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: KEY, queryFn: ({ signal }) => fetchAnnouncements(signal) });
  const end = useMutation({
    mutationFn: endAnnouncement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['admin-log'] });
    },
  });

  const items = data?.items || [];
  const live = items.filter((a) => a.live);
  const past = items.filter((a) => !a.live);

  return (
    <div className="adm-grid">
      {confirmElement}
      <Panel title="New announcement" note="shows as a banner at the top of the home page" wide>
        <Composer />
      </Panel>

      <Panel title="Showing now" note={isLoading ? '' : `${live.length} live`} wide>
        {isLoading ? <p className="adm-empty">Loading…</p> : error ? (
          <p className="adm-error">Couldn't load announcements: {error.message}{' '}
            <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
        ) : live.length === 0 ? <p className="adm-empty">Nothing is showing to students right now.</p> : (
          <ul className="adm-reports">
            {live.map((a) => (
              <li key={a.id}>
                <Preview message={a.message} tone={a.tone} />
                {end.isError && end.variables === a.id ? <p className="adm-error">{end.error.message}</p> : null}
                <div className="adm-report-foot">
                  <span className="adm-sub">
                    {AUDIENCE[a.semester || '']} · posted {ago(a.created_at)}{a.created_by ? ` by ${a.created_by}` : ''}
                    {a.ends_at ? ` · ends ${when(a.ends_at)}` : ' · no end date'}
                  </span>
                  <button type="button" className="btn sm" disabled={end.isPending && end.variables === a.id}
                          onClick={async () => {
                            const ok = await confirm({ title: 'Take this down?', message: 'Students stop seeing it within a few minutes.', confirmLabel: 'End now' });
                            if (ok) end.mutate(a.id);
                          }}>End now</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {past.length ? (
        <Panel title="Past announcements" wide>
          <Table head={['Message', 'For', 'Posted', 'Ended']}>
            {past.map((a) => (
              <tr key={a.id} className="dim">
                <td className="adm-clip" title={a.message}>{a.message}</td>
                <td>{AUDIENCE[a.semester || '']}</td>
                <td>{when(a.created_at)}</td>
                <td>{when(a.ends_at)}</td>
              </tr>
            ))}
          </Table>
        </Panel>
      ) : null}
    </div>
  );
}
