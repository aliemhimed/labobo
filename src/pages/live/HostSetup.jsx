import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import PageHead from '../../components/PageHead.jsx';
import { SUBJECTS, inSemester } from '../../lib/subjects.js';
import { useProfile } from '../../hooks/useProfile.js';
import { openSubscribeDialog } from '../../lib/access.js';
import { SECONDS_CHOICES, fetchLectures, fetchLiveMe, lastSettings, livePost, rememberSettings } from '../../lib/live.js';
import { displayTopic } from '../../lib/liveSubjects.js';
import '../../styles/live-teach.css';

/* Quick setup for pass holders: pick a subject and lectures, then start a
   game with friends. The server builds the questions from the bank ids. */
const QUICK = [5, 10, 15, 20];
const MAX_COUNT = 100;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const cleanTitle = (t) => String(t).replace(/ MCQ$/, '');

function Choice({ label, value, onChange, options }) {
  return (
    <div className="lt-field">
      <span id={`lh-${label}`} className="lt-label">{label}</span>
      <div className="lt-seg" role="group" aria-labelledby={`lh-${label}`}>
        {options.map(([v, text]) => (
          <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function Setup() {
  const navigate = useNavigate();
  const profile = useProfile();
  const semester = profile.data?.semester;
  const [subject, setSubject] = useState('');
  const [ticked, setTicked] = useState(() => new Set());
  const [count, setCount] = useState(10);
  const [settings, setSettings] = useState(() => ({ read_seconds: 5, clinical_double: true, ...lastSettings() }));
  const [name, setName] = useState('');
  const set = (key) => (value) => setSettings((s) => ({ ...s, [key]: value }));

  const entries = useMemo(() => Object.entries(SUBJECTS).filter(([, cfg]) => cfg.sources?.length), []);
  const mine = entries.filter(([, cfg]) => semester && inSemester(cfg, semester));
  const others = entries.filter(([, cfg]) => !(semester && inSemester(cfg, semester)));

  // Lecture names and counts come from the server (no question text is loaded).
  const tables = useMemo(() => (subject ? [...new Set(SUBJECTS[subject].sources.map((x) => x.table))] : []), [subject]);
  const bank = useQuery({
    queryKey: ['live-host-lectures', subject], enabled: !!subject, staleTime: 5 * 60_000,
    queryFn: () => fetchLectures(tables),
  });

  // Lectures in the order the server gives them, one per bank table.
  const lectures = useMemo(() => tables.flatMap((table) => (bank.data?.tables?.[table] || [])
    .map(({ topic, n }) => ({ key: `${table}|${topic}`, table, topic, n, name: displayTopic(table, topic) }))), [tables, bank.data]);

  useEffect(() => { setTicked(new Set()); }, [subject]);

  const chosen = useMemo(() => lectures.filter((l) => ticked.has(l.key)), [lectures, ticked]);
  const poolN = chosen.reduce((n, l) => n + l.n, 0);
  const max = Math.min(MAX_COUNT, poolN);
  const wanted = max === 0 ? 0 : Math.min(count, max);
  const toggle = (key) => setTicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const start = useMutation({
    mutationFn: () => {
      rememberSettings(settings);
      return livePost('create_student_room', {
        title: name.trim() || 'Study game',
        lectures: chosen.map((l) => ({ table: l.table, topic: l.topic })),
        count: wanted,
        settings: {
          mode: settings.mode, seconds: settings.seconds, team_size: settings.team_size, names: settings.names,
          leaderboard: settings.leaderboard, review: settings.review, advance: settings.advance,
          read_seconds: settings.read_seconds ?? 5, clinical_double: settings.clinical_double !== false,
          spells: settings.mode === 'individual' && settings.spells !== false,
        },
      });
    },
    onSuccess: (room) => navigate(`/live/teach/room/${room.id}`),
  });

  const subjectCard = ([key, cfg]) => (
    <button type="button" key={key} className="lt-pick" aria-pressed={subject === key} onClick={() => setSubject(key)}>
      {cleanTitle(cfg.title)}
    </button>
  );

  return (
    <main id="main" tabIndex={-1} className="lt">
      <PageHead title="Host a game" backLabel="Labobo Live" onBack={() => navigate('/live')} />
      <div className="lt-setup">
        <section aria-labelledby="lh-subj">
          <h2 id="lh-subj" style={{ fontSize: 'var(--t-21)' }}>Subject</h2>
          {mine.length ? <div className="lt-pick-grid">{mine.map(subjectCard)}</div> : null}
          {others.length ? (
            <>
              {mine.length ? <h3 className="lt-label" style={{ margin: '16px 0 0' }}>Other subjects</h3> : null}
              <div className="lt-pick-grid">{others.map(subjectCard)}</div>
            </>
          ) : null}
        </section>

        {subject ? (
          <section aria-labelledby="lh-lec">
            <h2 id="lh-lec" style={{ fontSize: 'var(--t-21)', marginBottom: 10 }}>Lectures</h2>
            {bank.isLoading ? <p className="lt-muted" role="status">Loading lectures…</p>
              : bank.error ? (
                <p className="lt-error" role="alert">Could not load the lectures: {bank.error.message}{' '}
                  <button type="button" className="btn sm" onClick={() => bank.refetch()}>Try again</button></p>
              ) : lectures.length === 0 ? <p className="lt-muted">No questions are open to you in this subject.</p> : (
                <div className="lt-card">
                  <div className="lt-controls" style={{ marginBottom: 10 }}>
                    <button type="button" className="btn sm" onClick={() => setTicked(new Set(lectures.map((l) => l.key)))}>Select all</button>
                    <button type="button" className="btn sm" onClick={() => setTicked(new Set())}>Clear</button>
                    <span className="lt-muted">{ticked.size} of {lectures.length} lectures, {plural(poolN, 'question')}</span>
                  </div>
                  <div className="lt-lectures">
                    {lectures.map((l) => (
                      <label key={l.key} className="lt-check">
                        <input type="checkbox" checked={ticked.has(l.key)} onChange={() => toggle(l.key)} />
                        <span>{l.name} <span className="lt-muted">({l.n})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
          </section>
        ) : null}

        <section aria-labelledby="lh-num">
          <h2 id="lh-num" style={{ fontSize: 'var(--t-21)', marginBottom: 10 }}>Number of questions</h2>
          <div className="lt-count">
            <button type="button" className="btn" onClick={() => setCount(Math.max(1, wanted - 1))} disabled={wanted <= 1} aria-label="Fewer questions">−</button>
            <input type="number" className="lt-input" min={1} max={Math.max(1, max)} value={wanted || count} aria-label="Number of questions"
                   onChange={(e) => setCount(Math.min(MAX_COUNT, Math.max(1, Number(e.target.value) || 1)))} />
            <button type="button" className="btn" onClick={() => setCount(Math.min(max, wanted + 1))} disabled={wanted >= max} aria-label="More questions">+</button>
            <div className="lt-seg" role="group" aria-label="Quick picks">
              {QUICK.map((n) => <button key={n} type="button" aria-pressed={wanted === n} disabled={n > max} onClick={() => setCount(n)}>{n}</button>)}
            </div>
          </div>
          {poolN ? <p className="lt-muted" style={{ marginTop: 8 }}>{max} available from the lectures you ticked.</p> : null}
        </section>

        <Choice label="Seconds per question" value={settings.seconds} onChange={set('seconds')}
                options={SECONDS_CHOICES.map((n) => [n, String(n)])} />
        <Choice label="Reading time" value={settings.read_seconds ?? 5} onChange={set('read_seconds')}
                options={[[0, 'Off'], [3, '3 s'], [5, '5 s'], [8, '8 s']]} />
        <Choice label="Clinical cases get double time" value={settings.clinical_double !== false} onChange={set('clinical_double')}
                options={[[true, 'On'], [false, 'Off']]} />
        <Choice label="Mode" value={settings.mode} onChange={set('mode')}
                options={[['individual', 'Individual'], ['teams', 'Teams']]} />
        {settings.mode === 'teams' ? (
          <div>
            <Choice label="Students per team" value={settings.team_size} onChange={set('team_size')}
                    options={[2, 3, 4, 5].map((n) => [n, String(n)])} />
            <p className="lt-muted" style={{ marginTop: -8 }}>Teams are made at random. Each question a different member is captain and answers for the team; the others advise.</p>
          </div>
        ) : null}
        {settings.mode === 'individual' ? (
          <div>
            <Choice label="Power-ups" value={settings.spells !== false} onChange={set('spells')}
                    options={[[true, 'On'], [false, 'Off']]} />
            <p className="lt-muted" style={{ marginTop: -8 }}>3 right answers in a row earn a power-up to use on a friend.</p>
          </div>
        ) : null}
        <Choice label="Next question" value={settings.advance || 'teacher'} onChange={set('advance')}
                options={[['teacher', 'You click'], ['auto', 'Automatic']]} />

        <label className="lt-field" style={{ marginBottom: 0 }}>
          <span>Room name (optional)</span>
          <input className="lt-input" value={name} maxLength={120} placeholder="Study game" onChange={(e) => setName(e.target.value)} />
        </label>

        {start.isError ? <p className="lt-error" role="alert">{start.error.message}</p> : null}
        <button type="button" className="btn primary lg lt-start" disabled={start.isPending || wanted === 0}
                onClick={() => start.mutate()}>
          {start.isPending ? 'Starting…' : wanted ? `Start with ${plural(wanted, 'question')}` : 'Pick a lecture to start'}
        </button>
      </div>
    </main>
  );
}

export default function HostSetup() {
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['live-me'], queryFn: fetchLiveMe, staleTime: 60_000 });
  if (isLoading) return <div className="splash" role="status">Loading</div>;

  if (error || !data?.can_host) {
    return (
      <>
        <TopBar subtitle="Live" />
        <main id="main" tabIndex={-1} className="lt">
          <div className="lt-state" role={error ? 'alert' : undefined}>
            {error ? (
              <>
                <h1>Could not load this page</h1>
                <p className="lt-sub">{error.message}</p>
                <button type="button" className="btn primary" onClick={() => refetch()}>Try again</button>
              </>
            ) : (
              <>
                <h1>Labobo Live</h1>
                <p className="lt-sub">Hosting games comes with the pass.</p>
                <button type="button" className="btn primary" onClick={() => openSubscribeDialog()}>See the pass</button>
                <Link className="btn" to="/live">Back to Labobo Live</Link>
              </>
            )}
          </div>
        </main>
      </>
    );
  }
  return (
    <>
      <TopBar subtitle="Live" />
      <Setup />
    </>
  );
}
