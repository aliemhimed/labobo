import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTeachers, grantTeacher, revokeTeacher } from '../../lib/adminApi.js';
import { useConfirm } from '../Confirm.jsx';
import { Panel, Table } from './parts.jsx';

const KEY = ['admin-teachers'];
const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function AddTeacher() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const add = useMutation({
    mutationFn: () => grantTeacher(email.trim()),
    onSuccess: () => {
      setEmail('');
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['admin-log'] });
    },
  });
  return (
    <form className="adm-form" onSubmit={(e) => { e.preventDefault(); if (email.trim()) add.mutate(); }}>
      <label className="adm-field">
        <span>Sign-in email of the teacher</span>
        <input type="email" className="adm-input" value={email} onChange={(e) => setEmail(e.target.value)}
               placeholder="teacher@example.com" autoComplete="off" />
        <em>The teacher must already have a Labobo account.</em>
      </label>
      {add.isError ? <p className="adm-error" role="alert">{add.error.message}</p> : null}
      {add.isSuccess && !email ? <p className="adm-ok" role="status">Teacher added.</p> : null}
      <div>
        <button type="submit" className="btn primary sm" disabled={!email.trim() || add.isPending}>
          {add.isPending ? 'Adding…' : 'Add teacher'}
        </button>
      </div>
    </form>
  );
}

export default function TeachersTab() {
  const qc = useQueryClient();
  const { confirm, element: confirmElement } = useConfirm();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: KEY, queryFn: ({ signal }) => fetchTeachers(signal) });
  const remove = useMutation({
    mutationFn: revokeTeacher,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['admin-log'] });
    },
  });
  const teachers = data?.teachers || [];

  return (
    <div className="adm-grid">
      {confirmElement}
      <Panel title="Add a teacher" note="can host Labobo Live quizzes" wide>
        <AddTeacher />
      </Panel>
      <Panel title="Teachers" note={isLoading ? '' : `${teachers.length}`} wide>
        {isLoading ? <p className="adm-empty">Loading…</p> : error ? (
          <p className="adm-error">Couldn't load teachers: {error.message}{' '}
            <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
        ) : teachers.length === 0 ? <p className="adm-empty">No teachers yet.</p> : (
          <>
            {remove.isError ? <p className="adm-error" role="alert">{remove.error.message}</p> : null}
            <Table head={['Name', 'Email', 'EU email', 'Added by', 'Added', '']}>
              {teachers.map((t) => (
                <tr key={t.user_id}>
                  <td>{t.username || '—'}</td>
                  <td>{t.email}</td>
                  <td>{t.uni_email || 'no EU email'}</td>
                  <td>{t.granted_by || '—'}</td>
                  <td>{day(t.granted_at)}</td>
                  <td>
                    <button type="button" className="btn sm" disabled={remove.isPending && remove.variables === t.user_id}
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Remove this teacher?', message: `${t.email} will no longer be able to host Live quizzes.`,
                                confirmLabel: 'Remove', danger: true,
                              });
                              if (ok) remove.mutate(t.user_id);
                            }}>Remove</button>
                  </td>
                </tr>
              ))}
            </Table>
          </>
        )}
      </Panel>
    </div>
  );
}
