import { useQuery } from '@tanstack/react-query';
import { fetchLog } from '../../lib/adminApi.js';
import { Panel, Table, ago } from './parts.jsx';

/* A readable line for each kind of admin_log entry (see admin.js). */
function describe(e) {
  const d = e.details || {};
  switch (e.action) {
    case 'delete_user':
      return `Deleted student ${d.username || d.email || e.target}${d.email && d.username ? ` (${d.email})` : ''}${d.quizzes != null ? `, ${d.quizzes} quizzes` : ''}`;
    case 'resolve_reports':
      return `Resolved ${d.ids?.length || 1} report${d.ids?.length === 1 ? '' : 's'}${d.question ? `: “${d.question}”` : ''}`;
    case 'reopen_reports':
      return `Reopened ${d.ids?.length || 1} report${d.ids?.length === 1 ? '' : 's'}${d.question ? `: “${d.question}”` : ''}`;
    case 'create_announcement':
      return `Posted an announcement${d.semester ? ` for semester ${d.semester}` : ''}: “${d.message}”`;
    case 'end_announcement':
      return `Ended an announcement: “${d.message}”`;
    case 'export_students':
      return `Downloaded the students CSV (${d.rows} rows)`;
    default:
      return e.action;
  }
}

const when = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function LogTab() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['admin-log'],
    queryFn: ({ signal }) => fetchLog(signal),
    refetchInterval: 60_000,
  });

  return (
    <Panel title="Admin activity" note="the latest 200 actions: deletions, reports, announcements, exports">
      {isLoading ? <p className="adm-empty">Loading…</p> : error ? (
        <p className="adm-error">Couldn't load the log: {error.message}{' '}
          <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
      ) : data.items.length === 0 ? <p className="adm-empty">Nothing yet. Every admin action is recorded here from now on.</p> : (
        <Table head={['When', 'Admin', 'What']}>
          {data.items.map((e) => (
            <tr key={e.id}>
              <td title={when(e.at)}>{ago(e.at)}</td>
              <td>{e.admin_email}</td>
              <td className={e.action === 'delete_user' ? 'adm-danger-text' : ''}>{describe(e)}</td>
            </tr>
          ))}
        </Table>
      )}
    </Panel>
  );
}
