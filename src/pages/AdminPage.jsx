import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';
import PageHead from '../components/PageHead.jsx';
import UsersTab from '../components/admin/UsersTab.jsx';
import UserDetail from '../components/admin/UserDetail.jsx';
import QuestionsTab from '../components/admin/QuestionsTab.jsx';
import { Stat, Panel, DayBars, HBars, Table, ago, pct, num } from '../components/admin/parts.jsx';
import { fetchSnapshot } from '../lib/adminApi.js';
import { fmtTime } from '../lib/leaderboard.js';
import '../styles/admin.css';

const KEY = ['admin-snapshot'];
const REFRESH_MS = 30_000;

/* Every counter the dashboard tracks, grouped. `k` is a key of the
   server's `counters` object. */
const COUNTER_GROUPS = [
  ['Students', [['students', 'Total students'], ['signups_7d', 'New this week'], ['semester_1', 'Semester 1'], ['semester_2', 'Semester 2'], ['no_semester', 'No semester yet']]],
  ['Visits', [['visitors_today', 'Visitors today'], ['visits_today', 'Visits today'], ['visitors_7d', 'Visitors, 7 days'], ['visits_30d', 'Visits, 30 days'], ['visitor_days_all', 'Visitor-days, all time']]],
  ['Quizzes', [['quizzes_24h', 'Last 24 hours'], ['quizzes_7d', 'Last 7 days'], ['quizzes_30d', 'Last 30 days'], ['quizzes_all', 'All time'], ['questions_answered_30d', 'Questions answered, 30 days']]],
  ['Content & community', [['questions_in_banks', 'Questions in banks'], ['subjects_stocked', 'Subjects stocked'], ['subjects_empty', 'Subjects empty'], ['reports_open', 'Open reports'], ['reports_7d', 'Reports this week'], ['leaderboard_week', 'Leaderboard, this week'], ['leaderboard_all', 'Leaderboard, all time'], ['rate_limit_hits_hour', 'Rate-limit hits, last hour']]],
];

function Overview({ data, onOpenUser, onOpenQuestions }) {
  const { users, sessions, reports, leaderboard, banks, system, errors, visits, counters } = data;
  const emptyBanks = (banks || []).filter((b) => b.total === 0);
  const health = system.failing.length === 0 ? 'ok' : 'bad';

  return (
    <>
      <div className="adm-stats">
        <Stat label="Students" value={num(counters.students)} hint={`+${num(counters.signups_7d)} this week`} />
        <Stat label="Visitors today" value={num(counters.visitors_today)} hint={`${num(counters.visitors_7d)} in 7 days`} />
        <Stat label="Active today" value={num(sessions?.active_users_24h)} hint="took a quiz" />
        <Stat label="Quizzes (24h)" value={num(counters.quizzes_24h)} hint={`${num(counters.quizzes_7d)} in 7 days`} />
        <Stat label="Avg score (30d)" value={pct(sessions?.avg_pct)} />
        <Stat label="Open reports" value={num(counters.reports_open)} tone={counters.reports_open ? 'warn' : ''} hint={`${num(counters.reports_7d)} new this week`} />
      </div>

      <div className="adm-grid">
        <Panel title="Daily visits" note="unique students per day, last 30 days" error={errors.visits} wide>
          {visits ? (
            <>
              <DayBars series={visits.by_day} label="Unique visitors per day, last 30 days" />
              <p className="adm-foot">
                {visits.today} today ({visits.today_hits} visits) · {visits.unique_7d} different students in 7 days · {visits.unique_30d} in 30 days.
                Counting started when this feature went live.
              </p>
            </>
          ) : null}
        </Panel>

        <Panel title="Counters" note="everything, at a glance" wide>
          <div className="adm-counters">
            {COUNTER_GROUPS.map(([group, items]) => (
              <div key={group} className="adm-counter-group">
                <h3>{group}</h3>
                <dl>
                  {items.map(([k, label]) => (
                    <div key={k}><dt>{label}</dt><dd>{num(counters[k])}</dd></div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Quizzes per day" note="last 14 days" error={errors.sessions}>
          {sessions ? <DayBars series={sessions.by_day} label="Quiz sessions per day, last 14 days" /> : null}
          {sessions?.capped ? <p className="adm-empty">Showing the most recent 5,000 sessions only.</p> : null}
        </Panel>

        <Panel title="New signups" note="last 30 days" error={errors.users}>
          {users ? <DayBars series={users.signups_by_day} label="New signups per day, last 30 days" /> : null}
          {users ? (
            <p className="adm-foot">
              {users.by_semester.map((s) => `${s.n} in ${s.key === 'none' ? 'no semester yet' : `semester ${s.key}`}`).join(' · ')}
            </p>
          ) : null}
        </Panel>

        <Panel title="Subjects" note="quizzes, last 30 days" error={errors.sessions}>
          {sessions ? <HBars items={sessions.by_subject} labelOf={(i) => i.subject} extra={(i) => ` · avg ${pct(i.avg_pct)}`} /> : null}
        </Panel>

        <Panel title="Modes" note="last 30 days" error={errors.sessions}>
          {sessions ? <HBars items={sessions.by_mode} /> : null}
        </Panel>

        <Panel title="Question reports" note={reports ? `${num(reports.open)} open` : undefined} wide error={errors.reports}>
          {reports ? (
            <>
              {reports.open ? (
                <div className="adm-chips">
                  {reports.by_reason.map((r) => <span key={r.key} className="adm-chip">{r.key} · {r.n}</span>)}
                </div>
              ) : <p className="adm-empty">No open reports. 🎉</p>}
              <button type="button" className="btn sm" onClick={onOpenQuestions}>
                Review questions: reports, likely wrong keys, most missed
              </button>
            </>
          ) : null}
        </Panel>

        <Panel title="Question banks" note={emptyBanks.length ? `${emptyBanks.length} empty` : 'all stocked'} error={errors.banks}>
          {banks ? (
            <Table head={['Subject', 'Sem', 'Questions']}>
              {banks.map((b) => (
                <tr key={b.subject} className={b.total === 0 ? 'dim' : ''}>
                  <td title={b.tables.map((t) => `${t.table}: ${t.n}`).join('\n')}>{b.subject}</td>
                  <td>{b.semester}</td>
                  <td>{b.total === 0 ? 'empty' : b.total}</td>
                </tr>
              ))}
            </Table>
          ) : null}
        </Panel>

        <Panel title="Leaderboards" note={`week of ${data.week_start}`} error={errors.leaderboard}>
          {leaderboard ? (leaderboard.boards.length === 0 ? <p className="adm-empty">No entries this week.</p> : (
            <Table head={['Subject', 'Entries', 'Leader']}>
              {leaderboard.boards.map((b) => (
                <tr key={b.subject}>
                  <td>{b.subject}</td>
                  <td>{b.entries}</td>
                  <td>{b.top[0] ? `${b.top[0].handle} · ${pct(b.top[0].score_pct)} · ${fmtTime(b.top[0].time_seconds)}` : '—'}</td>
                </tr>
              ))}
            </Table>
          )) : null}
        </Panel>

        <Panel title="Recent signups" error={errors.users}>
          {users ? (
            <Table head={['Name', 'Email', 'Sem', 'Joined']}>
              {users.recent.map((u) => (
                <tr key={u.id}>
                  <td><button type="button" className="adm-link" onClick={() => onOpenUser(u.id)}>{u.username || '—'}</button></td>
                  <td>{u.email}</td><td>{u.semester || '—'}</td><td>{ago(u.created_at)}</td>
                </tr>
              ))}
            </Table>
          ) : null}
        </Panel>

        <Panel title="Recent quizzes" error={errors.sessions}>
          {sessions ? (
            <Table head={['Subject', 'Mode', 'Score', 'When']}>
              {sessions.recent.map((s, i) => (
                <tr key={i}>
                  <td>{s.subject || '—'}</td><td>{s.mode || '—'}</td>
                  <td>{s.total ? `${s.score}/${s.total} · ${pct(s.pct)}` : '—'}</td><td>{ago(s.created_at)}</td>
                </tr>
              ))}
            </Table>
          ) : null}
        </Panel>

        <Panel title="System health" wide>
          <ul className="adm-health">
            <li className={health}><b>{health === 'ok' ? 'Healthy' : 'Degraded'}</b>
              {health === 'ok' ? ' · every data source answered' : ` · failing: ${system.failing.join(', ')}`}</li>
            <li><b>{system.db_ms} ms</b> · database round trip (all sections, in parallel)</li>
            <li><b>{system.rate_limits ? system.rate_limits.last_hour : '—'}</b> rate-limited requests recorded in the last hour
              {system.rate_limits ? ` (${system.rate_limits.total} still on file)` : ''}</li>
            <li>Auto-refreshes every {REFRESH_MS / 1000}s.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const tab = ['users', 'questions'].includes(params.get('tab')) ? params.get('tab') : 'overview';
  const studentId = params.get('u');

  const setView = (next) => setParams(next, { replace: false });
  const openUser = (id) => setView({ tab: 'users', u: id });

  const { data, error, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => fetchSnapshot(signal),
    refetchInterval: REFRESH_MS,
    retry: (n, e) => e.status !== 403 && e.status !== 401 && n < 1,
  });

  if (isLoading) return <div className="splash" role="status">Loading</div>;

  if (error && !data) {
    const denied = error.status === 403;
    return (
      <div className="center-wrap">
        <div className="state" role="alert">
          <h1>{denied ? 'Admins only' : "Couldn't load the dashboard"}</h1>
          <p>{denied ? "This account isn't on the admin list." : error.message}</p>
          <div className="state-actions">
            {denied ? <a className="btn primary" href="/">Back to Labobo</a>
              : <button type="button" className="btn primary" onClick={() => refetch()}>Try again</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar subtitle="Admin" />
      <main className="container adm">
        <PageHead title="Admin dashboard">
          <span className="adm-updated" aria-live="polite">
            {error ? 'Refresh failed · ' : ''}Updated {ago(new Date(dataUpdatedAt).toISOString())}
          </span>
          <button type="button" className="btn sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </PageHead>

        <div className="adm-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'overview'} onClick={() => setView({})}>Overview</button>
          <button type="button" role="tab" aria-selected={tab === 'users'} onClick={() => setView({ tab: 'users' })}>
            Users{data.counters.students != null ? <span>{data.counters.students}</span> : null}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'questions'} onClick={() => setView({ tab: 'questions' })}>
            Questions{data.counters.reports_open ? <span>{data.counters.reports_open} open</span> : null}
          </button>
        </div>

        {tab === 'users'
          ? (studentId
            ? <UserDetail id={studentId} onBack={() => setView({ tab: 'users' })} />
            : <UsersTab onOpen={openUser} />)
          : tab === 'questions'
            ? <QuestionsTab onOpenUser={openUser} />
            : <Overview data={data} onOpenUser={openUser} onOpenQuestions={() => setView({ tab: 'questions' })} />}
      </main>
    </>
  );
}
