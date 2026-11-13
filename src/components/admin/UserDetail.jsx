import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PASS_END, fetchUser, deleteUser, grantPass, revokePass } from '../../lib/adminApi.js';
import { useAuth } from '../../lib/auth.jsx';
import { useConfirm } from '../Confirm.jsx';
import { fmtTime } from '../../lib/leaderboard.js';
import { Stat, Panel, DayBars, HBars, Table, Sparkline, ago, pct, num } from './parts.jsx';

const date = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/* The student's plan, and the two things an admin does about it: switch a
   pass on once the student has paid (or change its end date), and take it
   off again. Students pay outside the site, so this is where a payment
   becomes access. */
function PassPanel({ id, plan }) {
  const qc = useQueryClient();
  const [day, setDay] = useState(() => (plan.pass?.live ? plan.pass.expires_at.slice(0, 10) : DEFAULT_PASS_END));
  const [note, setNote] = useState(plan.pass?.note || '');
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-user', id] });
    qc.invalidateQueries({ queryKey: ['admin-users'] });
  };
  // The pass runs to the end of the chosen day, in the admin's own time zone.
  const grant = useMutation({
    mutationFn: () => grantPass(id, new Date(`${day}T23:59:59`).toISOString(), note),
    onSuccess: refresh,
  });
  const revoke = useMutation({ mutationFn: () => revokePass(id), onSuccess: refresh });
  const busy = grant.isPending || revoke.isPending;
  const { pass, trial } = plan;

  let status = 'Free plan: the first two lectures of each subject.';
  if (pass?.live) status = `Pass on until ${date(pass.expires_at)}.`;
  else if (trial?.live) status = `Free trial running until ${date(trial.expires_at)}.`;
  else if (pass) status = `Pass ended on ${date(pass.expires_at)}. Free plan now.`;

  return (
    <Panel title="Subscription" note={pass?.live ? 'Paid' : trial?.live ? 'Trial' : 'Free'} wide>
      <p className="adm-pass-status">
        <b>{status}</b>
        {pass ? ` Switched on ${date(pass.granted_at)}${pass.granted_by ? ` by ${pass.granted_by}` : ''}.` : ''}
        {trial && !trial.live ? ` Trial used (${trial.email}, ended ${date(trial.expires_at)}).` : ''}
      </p>
      <div className="adm-filters">
        <label className="adm-field">
          <span>Pass runs until</span>
          <input type="date" className="adm-input" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label className="adm-field grow">
          <span>Note (how they paid, optional)</span>
          <input type="text" className="adm-input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="button" className="btn sm primary" disabled={busy || !day} onClick={() => grant.mutate()}>
          {grant.isPending ? 'Saving…' : pass?.live ? 'Update pass' : 'Switch pass on'}
        </button>
        {pass ? (
          <button type="button" className="btn sm danger" disabled={busy} onClick={() => revoke.mutate()}>
            {revoke.isPending ? 'Removing…' : 'Remove pass'}
          </button>
        ) : null}
      </div>
      {grant.isError ? <p className="adm-error" role="alert">Couldn't save the pass: {grant.error.message}</p> : null}
      {revoke.isError ? <p className="adm-error" role="alert">Couldn't remove the pass: {revoke.error.message}</p> : null}
    </Panel>
  );
}

/* Everything the admin knows about one student. */
export default function UserDetail({ id, onBack }) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: ({ signal }) => fetchUser(id, signal),
    refetchInterval: 60_000,
  });

  const { user } = useAuth();
  const qc = useQueryClient();
  const { confirm, element: confirmElement } = useConfirm();
  const remove = useMutation({
    mutationFn: () => deleteUser(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-snapshot'] });
      onBack();
    },
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
      {confirmElement}
      <div className="adm-user-head">
        <div className="adm-user-title">
          <h2>{name}</h2>
          {!p.is_admin && p.id !== user?.id ? (
            <button type="button" className="btn danger sm" disabled={remove.isPending}
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Delete ${name}?`,
                        message: `This permanently deletes their account and all their data: ${num(t.quizzes)} quizzes, ${num(t.visit_days)} visit days, ${num(t.leaderboard_entries)} leaderboard entries and ${num(t.reports)} reports. It can't be undone.`,
                        confirmLabel: 'Delete permanently',
                        danger: true,
                      });
                      if (ok) remove.mutate();
                    }}>
              {remove.isPending ? 'Deleting…' : 'Delete user'}
            </button>
          ) : null}
        </div>
        {remove.isError ? <p className="adm-error" role="alert">Couldn't delete: {remove.error.message}</p> : null}
        <p>
          {p.email}{p.semester ? ` · Semester ${p.semester}` : ' · no semester chosen'}
          {p.provider ? ` · ${p.provider === 'email' ? 'email & password' : p.provider}` : ''}
          {p.confirmed === false ? ' · email not confirmed' : ''}
        </p>
        <p className="adm-sub">
          Joined {date(p.created_at)} · last sign-in {ago(p.last_sign_in_at)} · first quiz {date(t.first_quiz_at)}
        </p>
      </div>

      {data.plan ? <PassPanel key={data.plan.pass?.expires_at || 'none'} id={id} plan={data.plan} /> : null}

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

        <Panel title="Studying" note="study mode and flashcards" wide error={data.study?.error}>
          {data.study && !data.study.error ? (
            data.study.totals.answered === 0 ? <p className="adm-empty">Hasn't studied yet (or not since tracking started).</p> : (
              <>
                <div className="adm-stats">
                  <Stat label="Questions studied" value={num(data.study.totals.answered)}
                        hint={`${num(data.study.totals.study_answered)} study · ${num(data.study.totals.flashcards)} flashcards`} />
                  <Stat label="Got right" value={pct((data.study.totals.correct / data.study.totals.answered) * 100)} />
                  <Stat label="Different questions" value={num(data.study.totals.seen)} />
                  <Stat label="Study days" value={num(data.study.totals.days)} hint={`last ${ago(data.study.totals.last_at)}`} />
                </div>
                <DayBars series={data.study.by_day} label="Questions this student studied per day" />
                <Table head={['Subject', 'Answered', 'Right', 'Coverage', 'Last']}>
                  {data.study.by_bank.map((b) => (
                    <tr key={b.bank}>
                      <td>{b.label}</td><td>{num(b.answered)}</td><td>{pct(b.answered ? (b.correct / b.answered) * 100 : null)}</td>
                      <td>{b.coverage_pct === null ? '—' : `${pct(b.coverage_pct)} (${num(b.seen)}/${num(b.total)})`}</td><td>{ago(b.last_at)}</td>
                    </tr>
                  ))}
                </Table>
                <Table head={['Topic / lecture', 'Answered', 'Right', 'Last']}>
                  {data.study.by_topic.map((t) => (
                    <tr key={`${t.bank}:${t.topic}`}>
                      <td>{t.topic}<div className="adm-sub">{t.label}</div></td>
                      <td>{num(t.answered)}</td><td>{pct(t.answered ? (t.correct / t.answered) * 100 : null)}</td><td>{ago(t.last_at)}</td>
                    </tr>
                  ))}
                </Table>
              </>
            )
          ) : null}
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
            <Table head={['Reason', 'Subject', 'Note', 'When', 'Status']}>
              {data.reports.map((r) => (
                <tr key={r.id}><td>{r.reason}</td><td>{r.subject || '—'}</td><td>{r.note || '—'}</td><td>{ago(r.created_at)}</td>
                  <td>{r.resolved_at ? `Resolved ${ago(r.resolved_at)}` : 'Open'}</td></tr>
              ))}
            </Table>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
