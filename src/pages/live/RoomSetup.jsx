import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import PageHead from '../../components/PageHead.jsx';
import { SECONDS_CHOICES, createRoom, lastSettings, rememberSettings } from '../../lib/live.js';
import TeacherGate from './TeacherGate.jsx';
import { drawQuestions, loadQuizItems, roomQuestion } from './quizData.js';
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

function Setup({ quiz, items, missing, pool, count, bank }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => lastSettings());
  const set = (key) => (value) => setSettings((s) => ({ ...s, [key]: value }));

  const start = useMutation({
    mutationFn: () => {
      rememberSettings(settings);
      return createRoom({ quiz_id: quiz.id, title: quiz.title, settings, questions: drawQuestions({ items, pool, count: wanted, bank }).questions.map(roomQuestion) });
    },
    onSuccess: (room) => navigate(`/live/teach/room/${room.id}`),
  });

  // What one start will hold: the chosen questions plus random ones from the pool lectures.
  const wanted = Math.max(count || 0, items.length);
  const preview = useMemo(() => drawQuestions({ items, pool, count: wanted, bank }), [items, pool, wanted, bank]);
  const total = preview.questions.length;
  const lectureNames = [...new Set(pool.map((p) => p.topic))];
  const makeup = pool.length === 0 ? plural(items.length, 'question')
    : items.length === 0 ? `${plural(total, 'random question')} from ${lectureNames.join(', ')}`
      : `${total} questions: ${items.length} chosen + ${preview.random} random from ${lectureNames.join(', ')}`;

  return (
    <main id="main" tabIndex={-1} className="lt">
      <PageHead title="Start a room" backLabel="Teacher home" onBack={() => navigate('/live/teach')} />
      <div className="lt-setup">
        <div className="lt-card">
          <h2>{quiz.title}</h2>
          <p className="lt-sub">{makeup} · {quiz.subject}</p>
          {preview.short ? <p className="lt-muted">Only {total} {total === 1 ? 'question is' : 'questions are'} available, the quiz will have {total}.</p> : null}
          <p className="lt-muted">The random questions are picked again each time you start.</p>
          {missing ? <p className="lt-error" role="alert">{missing} {missing === 1 ? 'question is' : 'questions are'} no longer in the bank and will be left out.</p> : null}
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
          </div>
        </details>

        {start.isError ? <p className="lt-error" role="alert">{start.error.message}</p> : null}
        <button type="button" className="btn primary lg lt-start" disabled={start.isPending || total === 0}
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
    queryKey: ['live-quiz-items', id], queryFn: () => loadQuizItems(id), gcTime: 0,
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
  } else body = <Setup quiz={{ ...data.quiz, id }} items={data.items} missing={data.missing} pool={data.pool} count={data.count} bank={data.bank} />;

  return (
    <TeacherGate>
      <TopBar subtitle="Live" />
      {body}
    </TeacherGate>
  );
}
