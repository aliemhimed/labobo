import { Panel, Stat, Table, num } from './parts.jsx';

/* 'YYYY-MM-DD' as a local calendar date ("24 Sep"), without the UTC shift
   new Date('2026-09-24') would bring. */
const day = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const share = (part, whole) => (whole ? Math.round((100 * part) / whole) : null);

/* Are students coming back? "Active" = opened the app or finished a quiz
   that day. Weeks are the 7 days ending today, the 7 before that, and so on. */
export function RetentionPanel({ retention: r, error }) {
  const rate = r ? share(r.retained, r.prev_active) : null;
  return (
    <Panel title="Retention" note="are students coming back? weeks end today" error={error} wide>
      {r ? (
        <>
          <div className="adm-stats adm-stats-sm">
            <Stat label="Active this week" value={num(r.active_7d)} />
            <Stat label="Came back" value={num(r.returning_7d)} hint="active before this week too" />
            <Stat label="New this week" value={num(r.new_7d)} hint="first time active" />
            <Stat label="Kept from last week" value={rate === null ? '—' : `${rate}%`}
                  hint={`${num(r.retained)} of ${num(r.prev_active)} came back`} />
          </div>
          <Table head={['Week', 'Active', 'Came back from the week before']}>
            {[...r.weekly].reverse().map((w) => {
              const p = share(w.retained, w.prev_active);
              return (
                <tr key={w.start}>
                  <td>{day(w.start)} – {day(w.end)}</td>
                  <td>{num(w.active)}</td>
                  <td>
                    {w.prev_active ? (
                      <span className="adm-ret">
                        <span className="adm-hbar-track"><i style={{ width: `${p}%` }} /></span>
                        <span>{p}% <em>({w.retained} of {w.prev_active})</em></span>
                      </span>
                    ) : <span className="adm-sub">no one active the week before</span>}
                  </td>
                </tr>
              );
            })}
          </Table>
        </>
      ) : null}
    </Panel>
  );
}

/* Students who were active in the last month but not in the last 7 days:
   the ones still worth a nudge. */
export function QuietPanel({ retention: r, error, onOpenUser }) {
  return (
    <Panel title="Gone quiet" note={r ? `${num(r.quiet_count)} not back in 7+ days · ${num(r.lapsed_count)} gone 30+ days` : undefined} error={error} wide>
      {r ? (r.quiet.length === 0 ? <p className="adm-empty">Everyone active this month has been back in the last week. 🎉</p> : (
        <Table head={['Student', 'Last active', 'Away', 'Active days', 'Quizzes']}>
          {r.quiet.map((u) => (
            <tr key={u.id}>
              <td>
                <button type="button" className="adm-link" onClick={() => onOpenUser(u.id)}>{u.username || u.email || u.id.slice(0, 8)}</button>
                {u.username && u.email ? <div className="adm-sub">{u.email}</div> : null}
              </td>
              <td>{day(u.last_active)}</td>
              <td>{u.days_away} days</td>
              <td>{num(u.active_days)}</td>
              <td>{num(u.quizzes)}</td>
            </tr>
          ))}
        </Table>
      )) : null}
    </Panel>
  );
}
