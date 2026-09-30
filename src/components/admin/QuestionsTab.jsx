import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchQuestions, reopenReports, resolveReports } from '../../lib/adminApi.js';
import { displaySrc, questionFromRow } from '../../lib/questions.js';
import { Stat, Panel, Table, ago, pct, num } from './parts.jsx';

const KEY = ['admin-questions'];
const LETTERS = 'ABCDEF';

/* One question as it is in the bank, with how often each option was picked.
   Letters follow the bank's order; students see the options shuffled. */
function AdminQuestion({ question, stats }) {
  const q = questionFromRow(question.row, question.table);
  const share = (i) => (stats?.attempts ? (100 * Number(stats.picks?.[String(i)] || 0)) / stats.attempts : null);
  const blank = stats ? Number(stats.picks?.blank || 0) : 0;
  return (
    <div className="adm-q">
      <p className="adm-q-meta">{question.subject} · {q.topic}</p>
      <p className="adm-q-text">{q.q}</p>
      {q.images.length ? (
        <div className="adm-q-imgs">
          {q.images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer"><img src={displaySrc(src)} alt="Question image" loading="lazy" /></a>
          ))}
        </div>
      ) : null}
      <ol className="adm-q-opts">
        {q.options.map((o, i) => {
          const s = share(i);
          const hot = stats?.suspect && stats.top_wrong?.option === i;
          return (
            <li key={i} className={i === q.answer ? 'key' : hot ? 'hot' : ''}>
              <span className="adm-q-letter">{LETTERS[i]}</span>
              <span className="adm-q-opt">{o}{i === q.answer ? <em>keyed answer</em> : hot ? <em>most picked</em> : null}</span>
              {s !== null ? <span className="adm-q-share" title={`${Math.round(s)}% picked this`}><i style={{ width: `${s}%` }} /><b>{Math.round(s)}%</b></span> : null}
            </li>
          );
        })}
      </ol>
      {stats ? (
        <p className="adm-foot">
          {num(stats.attempts)} answers · {pct(stats.correct_pct)} correct{blank ? ` · ${num(blank)} left blank` : ''}
        </p>
      ) : null}
      {q.explanation ? (
        <details className="adm-q-expl"><summary>Explanation</summary><p>{q.explanation}</p></details>
      ) : null}
    </div>
  );
}

function ReportGroup({ group, onOpenUser }) {
  const qc = useQueryClient();
  const resolve = useMutation({
    mutationFn: () => resolveReports(group.reports.map((r) => r.id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['admin-snapshot'] });
    },
  });
  const n = group.reports.length;
  return (
    <li className="adm-rgroup">
      <div className="adm-report-head">
        <strong>{n} report{n === 1 ? '' : 's'}</strong>
        <span>{[group.question?.subject || group.subject, group.topic].filter(Boolean).join(' · ')} · latest {ago(group.last_at)}</span>
      </div>
      <div className="adm-chips">
        {group.reasons.map((r) => <span key={r.key} className="adm-chip">{r.key}{r.n > 1 ? ` · ${r.n}` : ''}</span>)}
      </div>
      {group.question
        ? <AdminQuestion question={group.question} stats={group.stats} />
        : (
          <div className="adm-q">
            <p className="adm-q-text">{group.question_text}</p>
            <p className="adm-foot">{group.question_id ? 'This question is no longer in its bank.' : 'Older report: it doesn’t say which question, only its text.'}</p>
          </div>
        )}
      {group.reports.some((r) => r.note) ? (
        <ul className="adm-notes">
          {group.reports.filter((r) => r.note).map((r) => (
            <li key={r.id}>
              “{r.note}” <span>
                {r.user_id ? <button type="button" className="adm-link" onClick={() => onOpenUser(r.user_id)}>student</button> : 'student'} · {ago(r.created_at)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {resolve.isError ? <p className="adm-error">{resolve.error.message}</p> : null}
      <div className="adm-report-foot">
        {group.question_id ? <code>{group.question_id}</code> : <span />}
        <button type="button" className="btn sm" disabled={resolve.isPending} onClick={() => resolve.mutate()}>
          {resolve.isPending ? 'Resolving…' : n === 1 ? 'Mark resolved' : `Mark all ${n} resolved`}
        </button>
      </div>
    </li>
  );
}

function Resolved({ items }) {
  const qc = useQueryClient();
  const reopen = useMutation({
    mutationFn: (id) => reopenReports([id]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['admin-snapshot'] });
    },
  });
  if (!items.length) return <p className="adm-empty">Nothing resolved yet.</p>;
  return (
    <>
      {reopen.isError ? <p className="adm-error">{reopen.error.message}</p> : null}
      <Table head={['Question', 'Reason', 'Resolved', '']}>
        {items.map((r) => (
          <tr key={r.id}>
            <td className="adm-clip" title={r.question_text}>{r.question_text}</td>
            <td>{r.reason}</td>
            <td>{ago(r.resolved_at)}{r.resolved_by ? <div className="adm-sub">{r.resolved_by}</div> : null}</td>
            <td>
              <button type="button" className="btn sm" disabled={reopen.isPending && reopen.variables === r.id}
                      onClick={() => reopen.mutate(r.id)}>Reopen</button>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

/* Collapsed row per question, opening to the full question. */
function MissedList({ items }) {
  if (!items.length) return <p className="adm-empty">Nothing here yet.</p>;
  return (
    <ul className="adm-missed">
      {items.map((s) => (
        <li key={s.question_id}>
          <details>
            <summary>
              <b className={s.correct_pct < 40 ? 'low' : ''}>{pct(s.correct_pct)}</b>
              <span className="adm-clip">{s.question ? questionFromRow(s.question.row, s.question.table).q : s.question_id}</span>
              <em>{num(s.attempts)} answers</em>
            </summary>
            {s.question ? <AdminQuestion question={s.question} stats={s} /> : <p className="adm-empty">Not in the bank any more.</p>}
          </details>
        </li>
      ))}
    </ul>
  );
}

export default function QuestionsTab({ onOpenUser }) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => fetchQuestions(signal),
    refetchInterval: 60_000,
  });

  if (isLoading) return <p className="adm-empty">Loading questions…</p>;
  if (error) {
    return (
      <p className="adm-error">Couldn't load the questions: {error.message}{' '}
        <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
    );
  }

  const { reports, stats, resolved, errors, min_attempts: min } = data;
  return (
    <>
      <div className="adm-stats">
        <Stat label="Open reports" value={num(reports?.open)} tone={reports?.open ? 'warn' : ''}
              hint={reports ? `on ${num(reports.groups.length)} question${reports.groups.length === 1 ? '' : 's'}` : undefined} />
        <Stat label="Likely wrong keys" value={num(stats.suspect_count)} tone={stats.suspect_count ? 'warn' : ''}
              hint="a wrong option is picked most" />
        <Stat label="Questions with data" value={num(stats.scored)} hint={`${min}+ answers each`} />
        <Stat label="Questions answered" value={num(stats.tracked)} hint="at least once" />
      </div>

      {errors.questions ? <p className="adm-error">Couldn't load the question texts: {errors.questions}</p> : null}

      <div className="adm-grid">
        <Panel title="Reported questions" note="most reported first" error={errors.reports} wide>
          {reports ? (reports.groups.length === 0 ? <p className="adm-empty">No open reports. 🎉</p> : (
            <ul className="adm-reports">
              {reports.groups.map((g) => <ReportGroup key={g.key} group={g} onOpenUser={onOpenUser} />)}
            </ul>
          )) : null}
        </Panel>

        <Panel title="Likely wrong answer key" note={`more students picked one wrong option than the keyed answer (${min}+ answers)`} error={errors.stats} wide>
          {stats.suspects.length === 0 ? <p className="adm-empty">None so far. They show up here once enough students have answered.</p> : (
            <ul className="adm-reports">
              {stats.suspects.map((s) => (
                <li key={s.question_id} className="adm-rgroup">
                  {s.question ? <AdminQuestion question={s.question} stats={s} /> : <code>{s.question_id}</code>}
                  <div className="adm-report-foot"><code>{s.question_id}</code><span /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Most missed" note="lowest share correct, practice and exams" error={errors.stats}>
          <MissedList items={stats.hardest} />
        </Panel>

        <Panel title="Recently resolved" error={errors.resolved}>
          {resolved ? <Resolved items={resolved} /> : null}
        </Panel>
      </div>
    </>
  );
}
