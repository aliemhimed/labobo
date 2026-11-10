import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReviews, setReviewStatus } from '../../lib/adminApi.js';
import { Panel, ago } from './parts.jsx';

const KEY = ['admin-reviews'];
const LABEL = { pending: 'Waiting', approved: 'On the home page', hidden: 'Hidden' };

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

function ReviewList({ items, act }) {
  if (!items.length) return null;
  return (
    <ul className="adm-reports">
      {items.map((r) => (
        <li key={r.id}>
          <p className="adm-review-head">
            <b>{r.name}</b> <span className="adm-stars" aria-label={`${r.rating} out of 5 stars`}>{stars(r.rating)}</span>
          </p>
          <p className="adm-review-body" dir="auto">{r.body}</p>
          {act.isError && act.variables?.id === r.id ? <p className="adm-error">{act.error.message}</p> : null}
          <div className="adm-report-foot">
            <span className="adm-sub">
              {LABEL[r.status]} · written {ago(r.updated_at)}{r.decided_by && r.status !== 'pending' ? ` · by ${r.decided_by}` : ''}
            </span>
            <span className="adm-actions">
              {r.status !== 'approved' ? (
                <button type="button" className="btn primary sm" disabled={act.isPending}
                        onClick={() => act.mutate({ id: r.id, status: 'approved' })}>Approve</button>
              ) : null}
              {r.status !== 'hidden' ? (
                <button type="button" className="btn sm" disabled={act.isPending}
                        onClick={() => act.mutate({ id: r.id, status: 'hidden' })}>Hide</button>
              ) : null}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ReviewsTab() {
  const qc = useQueryClient();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: KEY, queryFn: ({ signal }) => fetchReviews(signal) });
  const act = useMutation({
    mutationFn: ({ id, status }) => setReviewStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['admin-log'] });
    },
  });

  if (isLoading) return <p className="adm-empty">Loading…</p>;
  if (error) {
    return (
      <p className="adm-error">Couldn't load reviews: {error.message}{' '}
        <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
    );
  }

  const items = data?.items || [];
  const by = (s) => items.filter((r) => r.status === s);
  const approved = by('approved');
  const avg = approved.length ? (approved.reduce((n, r) => n + r.rating, 0) / approved.length).toFixed(1) : null;

  return (
    <div className="adm-grid">
      <Panel title="Waiting for you" note="approve to show on every student's home page" wide>
        {by('pending').length ? <ReviewList items={by('pending')} act={act} />
          : <p className="adm-empty">No new reviews. When a student writes or edits one, it waits here.</p>}
      </Panel>
      <Panel title="On the home page" note={avg ? `${approved.length} shown · ${avg} stars on average` : 'none yet'} wide>
        {approved.length ? <ReviewList items={approved} act={act} />
          : <p className="adm-empty">The reviews section stays hidden until you approve at least 3.</p>}
      </Panel>
      {by('hidden').length ? (
        <Panel title="Hidden" wide><ReviewList items={by('hidden')} act={act} /></Panel>
      ) : null}
    </div>
  );
}
