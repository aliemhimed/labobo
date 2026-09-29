import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '../../lib/adminApi.js';
import { fmtTime } from '../../lib/leaderboard.js';
import { Stat, Panel, DayBars, HBars, Table, Sparkline, ago, pct, num } from './parts.jsx';

const date = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/* Everything the admin knows about one student. */
export default function UserDetail({ id, onBack }) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: ({ signal }) => fetchUser(id, signal),
    refetchInterval: 60_000,
  });

  const back = <button type="button" className="back-link adm-back" onClick={onBack}>← All students</button>;
  if (isLoading) return <>{back}<p className="adm-empty">Loading student…</p></>;
  if (error) {
    return (
      <>{back}<p className="adm-error">Couldn't load this student: {error.message}{' '}
        <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p></>
    );
  }

  const { profile: p, totals: t } = data;
  const name = p.username || p.email || 'Student';
  const weakest = data.by_subject.filter((s) => s.avg_pct !== null && s.n >= 2).sort((a, b) => a.avg_pct - b.avg_pct)[0];
  const strongest = data.by_subject.filter((s) => s.avg_pct !== null && s.n >= 2).sort((a, b) => b.avg_pct - a.avg_pct)[0];

  return (
    <>
      {back}
      <div className="adm-user-head">
        <h2>{name}</h2>
        <p>
          {p.email}{p.semester ? ` · Semester ${p.semester}` : ' · no semester chosen'}
          {p.provider ? ` · ${p.provider === 'email' ? 'email & password' : p.provider}` : ''}
          {p.confirmed === false ? ' · email not confirmed' : ''}
        </p>
        <p className="adm-sub">
          Joined {date(p.created_at)} · last sign-in {ago(p.last_sign_in_at)} · first quiz {date(t.first_quiz_at)}
        </p>
      </div>

      <div className="adm-stats">
        <Stat label="Quizzes" value={num(t.quizzes)} hint={`last ${ago(t.last_quiz_at)}`} />
        <Stat label="Questions answered" value={num(t.questions)} />
        <Stat label="Average score" value={pct(t.avg_pct)} hint={`best ${pct(t.best_pct)}`} />
        <Stat label="Current streak" value={`${t.streak}d`} hint={`${t.active_days} active days in all`} />
        <Stat label="Visit days" value={num(t.visit_days)} hint={`${num(t.visits)} visits`} />
        <Stat label="Leaderboard entries" value={num(t.leaderboard_entries)} />
        <Stat label="Reports filed" value={num(t.reports)} />
      </div>

      <div className="adm-grid">
        <Panel title="Quizzes per day" note="last 30 days">
          <DayBars series={data.activity_by_day} label="This student's quizzes per day" />
        </Panel>
        <Panel title="Visits per day" note="last 30 days">
          <DayBars series={data.visits_by_day} label="This student's visits per day" />
        </Panel>

        <Panel title="Score trend" note="last 30 quizzes, oldest to newest">
          <Sparkline points={data.trend} label="Score over their last quizzes" />
        </Panel>
        <Panel title="Strengths" >
          {strongest ? (
            <ul className="adm-health">
              <li><b>Strongest:</b> {strongest.key} · avg {pct(strongest.avg_pct)} over {strongest.n} quizzes</li>
              <li><b>Weakest:</b> {weakest.key} · avg {pct(weakest.avg_pct)} over {weakest.n} quizzes</li>
              <li>Favourite mode: {data.by_mode[0]?.key ?? '—'}</li>
            </ul>
          ) : <p className="adm-empty">Needs a couple of quizzes in a subject.</p>}
        </Panel>

        <Panel title="By subject" wide>
          {data.by_subject.length === 0 ? <p className="adm-empty">No quizzes yet.</p> : (
            <Table head={['Subject', 'Quizzes', 'Average', 'Best', 'Last']}>
              {data.by_subject.map((s) => (
                <tr key={s.key}><td>{s.key}</td><td>{s.n}</td><td>{pct(s.avg_pct)}</td><td>{pct(s.best_pct)}</td><td>{ago(s.last)}</td></tr>
              ))}
            </Table>
          )}
        </Panel>

        <Panel title="Modes"><HBars items={data.by_mode} /></Panel>

        <Panel title="Leaderboard results">
          {data.leaderboard.length === 0 ? <p className="adm-empty">None yet.</p> : (
            <Table head={['Week', 'Subject', 'Score', 'Time']}>
              {data.leaderboard.map((e, i) => (
                <tr key={i}><td>{e.week_start}</td><td>{e.subject}</td><td>{pct(e.score_pct)}</td><td>{fmtTime(e.time_seconds)}</td></tr>
              ))}
            </Table>
          )}
        </Panel>

        <Panel title="Recent quizzes" wide>
          {data.recent.length === 0 ? <p className="adm-empty">No quizzes yet.</p> : (
            <Table head={['Subject', 'Mode', 'Score', 'When']}>
              {data.recent.map((s, i) => (
                <tr key={i}>
                  <td>{s.subject || '—'}</td><td>{s.mode || '—'}</td>
                  <td>{s.total ? `${s.score}/${s.total} · ${pct(s.pct)}` : '—'}</td><td>{ago(s.created_at)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>

        {data.reports.length ? (
          <Panel title="Reports filed" wide>
            <Table head={['Reason', 'Subject', 'Note', 'When']}>
              {data.reports.map((r) => (
                <tr key={r.id}><td>{r.reason}</td><td>{r.subject || '—'}</td><td>{r.note || '—'}</td><td>{ago(r.created_at)}</td></tr>
              ))}
            </Table>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
