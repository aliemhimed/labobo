import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import { useConfirm } from '../../components/Confirm.jsx';
import { deleteQuiz, fetchHosted, fetchQuizzes } from '../../lib/live.js';
import TeacherGate from './TeacherGate.jsx';
import '../../styles/live-teach.css';

const date = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const STAGES = { lobby: 'Waiting for students', question: 'Running', reveal: 'Running', leaderboard: 'Running', finished: 'Finished' };

function Quizzes() {
  const qc = useQueryClient();
  const { confirm, element } = useConfirm();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['live-quizzes'], queryFn: fetchQuizzes });
  const remove = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live-quizzes'] }),
  });
  const quizzes = data?.quizzes || [];

  return (
    <section className="lt-section" aria-labelledby="lt-quizzes">
      {element}
      <h2 id="lt-quizzes">Your quizzes</h2>
      {isLoading ? <p className="lt-muted" role="status">Loading…</p>
        : error ? <p className="lt-error" role="alert">Could not load your quizzes: {error.message}{' '}
          <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
          : quizzes.length === 0 ? <p className="lt-muted">No quizzes yet. Press New quiz to build your first one.</p> : (
            <ul className="lt-list">
              {quizzes.map((q) => (
                <li key={q.id} className="lt-row">
                  <div className="lt-row-main">
                    <div className="lt-row-title">{q.title}</div>
                    <div className="lt-muted">{q.subject} · {q.count} {q.count === 1 ? 'question' : 'questions'} · edited {date(q.updated_at)}</div>
                  </div>
                  <div className="lt-row-actions">
                    <Link className="btn primary sm" to={`/live/teach/start/${q.id}`}>Start</Link>
                    <Link className="btn sm" to={`/live/teach/quiz/${q.id}`}>Edit</Link>
                    <button type="button" className="btn sm" disabled={remove.isPending && remove.variables === q.id}
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Delete this quiz?', message: `"${q.title}" will be deleted. Past results are kept.`,
                                confirmLabel: 'Delete', danger: true,
                              });
                              if (ok) remove.mutate(q.id);
                            }}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      {remove.isError ? <p className="lt-error" role="alert">{remove.error.message}</p> : null}
    </section>
  );
}

function Rooms() {
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['live-hosted'], queryFn: fetchHosted });
  const rooms = data?.rooms || [];

  return (
    <section className="lt-section" aria-labelledby="lt-rooms">
      <h2 id="lt-rooms">Past rooms</h2>
      {isLoading ? <p className="lt-muted" role="status">Loading…</p>
        : error ? <p className="lt-error" role="alert">Could not load your rooms: {error.message}{' '}
          <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
          : rooms.length === 0 ? <p className="lt-muted">You have not run a room yet.</p> : (
            <ul className="lt-list">
              {rooms.map((r) => {
                const done = r.stage === 'finished';
                return (
                  <li key={r.room} className="lt-row">
                    <div className="lt-row-main">
                      <div className="lt-row-title">{r.title}</div>
                      <div className="lt-muted">
                        {date(r.date)} · {r.players} {r.players === 1 ? 'student' : 'students'}
                        {done && r.average != null ? ` · average ${Math.round(r.average)} points` : ''} · {STAGES[r.stage] || r.stage}
                      </div>
                    </div>
                    <div className="lt-row-actions">
                      {done
                        ? <Link className="btn sm" to={`/live/results/${r.room}`}>Results</Link>
                        : <Link className="btn primary sm" to={`/live/teach/room/${r.room}`}>Running — open</Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
    </section>
  );
}

export default function TeacherHome() {
  return (
    <TeacherGate>
      <TopBar subtitle="Live" />
      <main id="main" tabIndex={-1} className="lt">
        <div className="lt-head">
          <h1>Labobo Live: teacher</h1>
          <Link className="btn primary" to="/live/teach/quiz/new">New quiz</Link>
        </div>
        <Quizzes />
        <Rooms />
      </main>
    </TeacherGate>
  );
}
