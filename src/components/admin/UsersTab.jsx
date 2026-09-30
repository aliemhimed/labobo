import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { downloadStudentsCsv, fetchUsers } from '../../lib/adminApi.js';
import { Stat, Panel, Table, ago, pct, num } from './parts.jsx';

const SORTS = {
  active: { label: 'Last active', by: (u) => -(new Date(u.last_quiz_at || u.last_visit_day || u.last_sign_in_at || 0)) },
  quizzes: { label: 'Most quizzes', by: (u) => -u.quizzes },
  avg: { label: 'Highest average', by: (u) => -(u.avg_pct ?? -1) },
  joined: { label: 'Newest', by: (u) => -new Date(u.created_at) },
};

const lastSeen = (u) => u.last_quiz_at || u.last_visit_day || u.last_sign_in_at || null;

export default function UsersTab({ onOpen }) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: ({ signal }) => fetchUsers(signal),
    refetchInterval: 60_000,
  });
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('all');
  const [sort, setSort] = useState('active');
  const qc = useQueryClient();
  const exporting = useMutation({
    mutationFn: downloadStudentsCsv,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-log'] }),
  });

  const list = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.users
      .filter((u) => (semester === 'all' ? true : semester === 'none' ? !u.semester : u.semester === semester))
      .filter((u) => !q || `${u.username || ''} ${u.email || ''}`.toLowerCase().includes(q))
      .sort((a, b) => SORTS[sort].by(a) - SORTS[sort].by(b));
  }, [data, search, semester, sort]);

  if (isLoading) return <p className="adm-empty">Loading students…</p>;
  if (error) {
    return (
      <p className="adm-error">Couldn't load students: {error.message}{' '}
        <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
    );
  }

  const all = data.users;
  const weekAgo = Date.now() - 7 * 86400000;
  const activeWeek = all.filter((u) => new Date(lastSeen(u) || 0) > weekAgo).length;

  return (
    <>
      <div className="adm-stats">
        <Stat label="Students" value={num(all.length)} />
        <Stat label="Active this week" value={num(activeWeek)} />
        <Stat label="Never took a quiz" value={num(all.filter((u) => u.quizzes === 0).length)} />
        <Stat label="No semester yet" value={num(all.filter((u) => !u.semester).length)} />
        <Stat label="Semester 1" value={num(all.filter((u) => u.semester === '1').length)} />
        <Stat label="Semester 2" value={num(all.filter((u) => u.semester === '2').length)} />
        <Stat label="Signed in with Google" value={num(all.filter((u) => u.provider === 'google').length)} />
        <Stat label="Email & password" value={num(all.filter((u) => u.provider === 'email').length)} />
      </div>

      <Panel title="All students" note={`${list.length} shown`}>
        <div className="adm-filters">
          <input type="search" className="adm-input" placeholder="Search name or email" aria-label="Search students"
                 value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="adm-input" aria-label="Semester" value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="all">Every semester</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="none">No semester</option>
          </select>
          <select className="adm-input" aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <button type="button" className="btn sm" disabled={exporting.isPending} onClick={() => exporting.mutate()}
                  title="Every student, with their activity totals. Exports are recorded in the admin log.">
            {exporting.isPending ? 'Preparing…' : 'Download CSV'}
          </button>
        </div>
        {exporting.isError ? <p className="adm-error" role="alert">Couldn't export: {exporting.error.message}</p> : null}
        {list.length === 0 ? <p className="adm-empty">No students match.</p> : (
          <Table head={['Student', 'Sem', 'Quizzes', 'Questions', 'Avg', 'Visit days', 'Last active', 'Joined']}>
            {list.map((u) => (
              <tr key={u.id}>
                <td>
                  <button type="button" className="adm-link" onClick={() => onOpen(u.id)}>{u.username || u.email || u.id.slice(0, 8)}</button>
                  {u.username && u.email ? <div className="adm-sub">{u.email}</div> : null}
                </td>
                <td>{u.semester || '—'}</td>
                <td>{num(u.quizzes)}</td>
                <td>{num(u.questions)}</td>
                <td>{pct(u.avg_pct)}</td>
                <td>{num(u.visit_days)}</td>
                <td>{ago(lastSeen(u))}</td>
                <td>{ago(u.created_at)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
