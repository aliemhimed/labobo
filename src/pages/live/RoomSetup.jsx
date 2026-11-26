import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import PageHead from '../../components/PageHead.jsx';
import { SECONDS_CHOICES, lastSettings, rememberSettings, startQuiz } from '../../lib/live.js';
import { displayTopic } from '../../lib/liveSubjects.js';
import TeacherGate from './TeacherGate.jsx';
import { loadQuizSummary } from './quizData.js';
import '../../styles/live-teach.css';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Choice({ label, value, onChange, options }) {
  return (
    <div className="lt-field">
      <span id={`lt-${label}`} className="lt-label">{label}</span>
      <div className="lt-seg" role="group" aria-labelledby={`lt-${label}`}>
        {options.map(([v, text, disabled]) => (
          <button key={String(v)} type="button" aria-pressed={value === v} disabled={disabled} onClick={() => onChange(v)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function Setup({ quiz, fixed, pool, count }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => ({ read_seconds: 5, clinical_double: true, ...lastSettings() }));
  const set = (key) => (value) => setSettings((s) => ({ ...s, [key]: value }));
  const [short, setShort] = useState(null);

  const start = useMutation({
    mutationFn: () => {
      rememberSettings(settings);
      return startQuiz(quiz.id, settings, quiz.title);
    },
    onSuccess: (room) => {
      if (room.short) { setShort(Array.isArray(room.questions) ? room.questions.length : Number(room.questions) || 0); setTimeout(() => navigate(`/live/teach/room/${room.id}`), 1800); } else navigate(`/live/teach/room/${room.id}`);
    },
  });

  // What one start will hold: the chosen questions plus random ones from the pool lectures.
  const poolN = pool.reduce((n, l) => n + l.n, 0);
  const wanted = Math.max(count || 0, fixed);
  const total = Math.min(wanted, fixed + poolN);
  const random = Math.max(0, total - fixed);
  const lectureNames = [...new Set(pool.map((p) => displayTopic(p.table, p.topic)))];
  const makeup = pool.length === 0 ? plural(fixed, 'question')
    : fixed === 0 ? `${plural(total, 'random question')} from ${lectureNames.join(', ')}`
      : `${total} questions: ${fixed} chosen + ${random} random from ${lectureNames.join(', ')}`;

  return (
    <main id="main" tabIndex={-1} className="lt">
      <PageHead title="Start a room" backLabel="Teacher home" onBack={() => navigate('/live/teach')} />
      <div className="lt-setup">
        <div className="lt-card">
          <h2>{quiz.title}</h2>
          <p className="lt-sub">{makeup} · {quiz.subject}</p>
          {pool.length ? (
            <ul className="lt-muted" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {pool.map((l) => <li key={`${l.table}|${l.topic}`}>{displayTopic(l.table, l.topic)} ({l.n})</li>)}
            </ul>
          ) : null}
          {wanted > fixed + poolN ? <p className="lt-muted">Only {total} {total === 1 ? 'question is' : 'questions are'} available, the quiz will have {total}.</p> : null}
          <p className="lt-muted">The random questions are picked again each time you start.</p>
        </div>

        <Choice label="Seconds per question" value={settings.seconds} onChange={set('seconds')}
                options={SECONDS_CHOICES.map((n) => [n, String(n)])} />
        <div>
          <Choice label="Mode" value={settings.mode} onChange={set('mode')}
                  options={[['individual', 'Individual'], ['teams', 'Teams']]} />
        </div>
        {settings.mode === 'teams' ? (
          <div>
            <Choice label="Students per team" value={settings.team_size} onChange={set('team_size')}
                    options={[2, 3, 4, 5].map((n) => [n, String(n)])} />
            <p className="lt-muted" style={{ marginTop: -8 }}>Teams are made at random. Each question a different member is captain and answers for the team; the others advise.</p>
          </div>
        ) : null}

        <details className="lt-more">
          <summary>More options</summary>
          <div>
            <Choice label="Names on the projector" value={settings.names} onChange={set('names')}
                    options={[['nicknames', 'Nicknames'], ['real', 'Real names']]} />
            <Choice label="Leaderboard for students" value={settings.leaderboard} onChange={set('leaderboard')}
                    options={[['all', 'Everyone'], ['top5', 'Top 5'], ['none', 'None']]} />
            <Choice label="Students can review questions afterwards" value={settings.review} onChange={set('review')}
                    options={[[true, 'Yes'], [false, 'No']]} />
            <Choice label="Next question" value={settings.advance || 'teacher'} onChange={set('advance')}
                    options={[['teacher', 'Teacher clicks'], ['auto', 'Automatic (8 s after the answer)']]} />
            <Choice label="Reading time" value={settings.read_seconds ?? 5} onChange={set('read_seconds')}
                    options={[[0, 'Off'], [3, '3 s'], [5, '5 s'], [8, '8 s']]} />
            <Choice label="Clinical cases get double time" value={settings.clinical_double !== false} onChange={set('clinical_double')}
                    options={[[true, 'On'], [false, 'Off']]} />
          </div>
        </details>

        {start.isError ? <p className="lt-error" role="alert">{start.error.message}</p> : null}
        {short != null ? <p className="lt-muted" role="status">Only {short} {short === 1 ? 'question was' : 'questions were'} available.</p> : null}
        <button type="button" className="btn primary lg lt-start" disabled={start.isPending || short != null || total === 0}
                onClick={() => start.mutate()}>
          {start.isPending ? 'Starting…' : 'Start'}
        </button>
      </div>
    </main>
  );
}

export default function RoomSetup() {
  const { id } = useParams();
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['live-quiz-summary', id], queryFn: () => loadQuizSummary(id), gcTime: 0,
  });

  let body;
  if (isLoading) body = <div className="splash" role="status">Loading</div>;
  else if (error) {
    body = (
      <main id="main" tabIndex={-1} className="lt">
        <div className="lt-state" role="alert">
          <h1>Could not load this quiz</h1>
          <p className="lt-sub">{error.message}</p>
          <button type="button" className="btn primary" onClick={() => refetch()}>Try again</button>
          <Link className="btn" to="/live/teach">Back</Link>
        </div>
      </main>
    );
  } else body = <Setup quiz={{ ...data.quiz, id }} fixed={data.fixed} pool={data.pool} count={data.count} />;

  return (
    <TeacherGate>
      <TopBar subtitle="Live" />
      {body}
    </TeacherGate>
  );
}
