import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PASS_END, approvePayment, fetchPayments, rejectPayment } from '../../lib/adminApi.js';
import { Panel, ago } from './parts.jsx';

const KEY = ['admin-payments'];
const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/* One uploaded receipt waiting for a decision: who sent it, the reference
   they were told to write in the transfer, the receipt itself, and the two
   things to do with it. Approving switches the student's pass on. */
export function PaymentCard({ item, onOpenUser, onApprove, onReject, busy, error }) {
  const [until, setUntil] = useState(DEFAULT_PASS_END);
  const [note, setNote] = useState('');
  const name = item.username || item.email || 'Student';
  return (
    <li className="adm-payment">
      <div className="adm-payment-receipt">
        {item.receipt_url && !item.is_pdf ? (
          <a href={item.receipt_url} target="_blank" rel="noopener noreferrer" title="Open the receipt full size">
            <img src={item.receipt_url} alt={`Receipt from ${name}`} loading="lazy" />
          </a>
        ) : item.receipt_url ? (
          <a className="btn sm" href={item.receipt_url} target="_blank" rel="noopener noreferrer">Open the PDF receipt</a>
        ) : <p className="adm-error">The receipt could not be loaded. Reload the page to try again.</p>}
      </div>
      <div className="adm-payment-body">
        <p className="adm-review-head">
          {onOpenUser ? <button type="button" className="adm-link" onClick={() => onOpenUser(item.user_id)}>{name}</button> : <b>{name}</b>}
        </p>
        <p className="adm-sub">
          {item.email}{item.semester ? ` · Semester ${item.semester}` : ''} · sent {ago(item.created_at)}
        </p>
        <p className="adm-payment-ref">Reference to look for in the bank transfer: <code>{item.reference}</code></p>
        {item.pass_until ? (
          <p className="adm-error">
            This student already has a pass until {day(item.pass_until)}. This is probably the same payment sent
            twice: check your bank before approving, or reject it with a note.
          </p>
        ) : null}
        {error ? <p className="adm-error" role="alert">{error}</p> : null}
        <div className="adm-filters">
          <label className="adm-field">
            <span>Pass runs until</span>
            <input type="date" className="adm-input" value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
          <button type="button" className="btn sm primary" disabled={busy || !until}
                  onClick={() => onApprove(item.id, new Date(`${until}T23:59:59`).toISOString())}>
            Approve and switch pass on
          </button>
        </div>
        <div className="adm-filters">
          <label className="adm-field grow">
            <span>If rejecting, tell the student why (they will see this)</span>
            <input type="text" className="adm-input" maxLength={300} value={note} placeholder="e.g. The amount received was 10 lari"
                   onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="button" className="btn sm danger" disabled={busy} onClick={() => onReject(item.id, note)}>Reject</button>
        </div>
      </div>
    </li>
  );
}

export function DecidedList({ items, onOpenUser }) {
  return (
    <ul className="adm-reports">
      {items.map((p) => (
        <li key={p.id}>
          <p className="adm-review-head">
            {onOpenUser ? <button type="button" className="adm-link" onClick={() => onOpenUser(p.user_id)}>{p.username || p.email || 'Student'}</button>
              : <b>{p.username || p.email || 'Student'}</b>}{' '}
            <span className={'adm-pay-status ' + p.status}>{p.status === 'approved' ? 'Approved' : 'Rejected'}</span>
          </p>
          <p className="adm-sub">
            <code>{p.reference}</code> · sent {day(p.created_at)} · decided {day(p.decided_at)}{p.decided_by ? ` by ${p.decided_by}` : ''}
            {p.note ? ` · "${p.note}"` : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function PaymentsTab({ onOpenUser }) {
  const qc = useQueryClient();
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => fetchPayments(signal),
    refetchInterval: 60_000,
  });
  const act = useMutation({
    mutationFn: ({ id, approve, until, note }) => (approve ? approvePayment(id, until) : rejectPayment(id, note)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-log'] });
    },
  });

  if (isLoading) return <p className="adm-empty">Loading…</p>;
  if (error) {
    return (
      <p className="adm-error">Couldn't load payments: {error.message}{' '}
        <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
    );
  }

  const items = data?.items || [];
  const waiting = items.filter((p) => p.status === 'pending');
  const decided = items.filter((p) => p.status !== 'pending');

  return (
    <div className="adm-grid">
      <Panel title="Receipts waiting for you" note={waiting.length ? `${waiting.length} to check` : 'none'} wide>
        {waiting.length ? (
          <ul className="adm-payments">
            {waiting.map((p) => (
              <PaymentCard key={p.id} item={p} onOpenUser={onOpenUser} busy={act.isPending}
                           error={act.isError && act.variables?.id === p.id ? act.error.message : ''}
                           onApprove={(id, until) => act.mutate({ id, approve: true, until })}
                           onReject={(id, note) => act.mutate({ id, approve: false, note })} />
            ))}
          </ul>
        ) : <p className="adm-empty">No receipts to check. When a student uploads one, it waits here.</p>}
      </Panel>
      {decided.length ? (
        <Panel title="Already decided" note={`${decided.length} most recent`} wide>
          <DecidedList items={decided} onOpenUser={onOpenUser} />
        </Panel>
      ) : null}
    </div>
  );
}
