import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import PageHead from '../../components/PageHead.jsx';
import { createCaseRoom, fetchCaseSet, lastSettings, rememberSettings } from '../../lib/live.js';
import TeacherGate from './TeacherGate.jsx';
import '../../styles/live-teach.css';

function Choice({ label, value, onChange, options }) {
  return (
    <div className="lt-field">
      <span id={`lt-${label}`} className="lt-label">{label}</span>
      <div className="lt-seg" role="group" aria-labelledby={`lt-${label}`}>
        {options.map(([v, text]) => (
          <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function Setup({ id, set }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => { const s = lastSettings(); return { names: s.names, team_size: s.team_size }; });
  const setKey = (key) => (value) => setSettings((s) => ({ ...s, [key]: value }));
  const count = set.cases?.length || 0;

  const start = useMutation({
    mutationFn: () => {
      rememberSettings({ ...lastSettings(), ...settings });
      return createCaseRoom({ set_id: id, settings });
    },
    onSuccess: (room) => navigate(`/live/teach/room/${room.id}`),
  });

  return (
    <main id="main" tabIndex={-1} className="lt">
      <PageHead title="Start a case room" backLabel="Teacher home" onBack={() => navigate('/live/teach')} />
      <div className="lt-setup">
        <div className="lt-card">
          <h2>{set.title}</h2>
          <p className="lt-sub">{count} {count === 1 ? 'case' : 'cases'}</p>
        </div>
        <div>
          <Choice label="Students per team" value={settings.team_size} onChange={setKey('team_size')}
                  options={[2, 3, 4, 5].map((n) => [n, String(n)])} />
          <p className="lt-muted" style={{ marginTop: -8 }}>Teams are made at random. Each team works through the cases at its own pace and gives one shared answer. You mark the answers.</p>
        </div>
        <Choice label="Names on the projector" value={settings.names} onChange={setKey('names')}
                options={[['nicknames', 'Nicknames'], ['real', 'Real names']]} />
        {start.isError ? <p className="lt-error" role="alert">{start.error.message}</p> : null}
        <button type="button" className="btn primary lg lt-start" disabled={start.isPending || count === 0} onClick={() => start.mutate()}>
          {start.isPending ? 'Starting…' : 'Start'}
        </button>
      </div>
    </main>
  );
}

export default function CaseSetup() {
  const { id } = useParams();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['live-case-set', id], queryFn: () => fetchCaseSet(id), gcTime: 0 });

  let body;
  if (isLoading) body = <div className="splash" role="status">Loading</div>;
  else if (error) {
    body = (
      <main id="main" tabIndex={-1} className="lt">
        <div className="lt-state" role="alert">
          <h1>Could not load this case set</h1>
          <p className="lt-sub">{error.message}</p>
          <button type="button" className="btn primary" onClick={() => refetch()}>Try again</button>
          <Link className="btn" to="/live/teach">Back</Link>
        </div>
      </main>
    );
  } else body = <Setup id={id} set={data.set} />;

  return (
    <TeacherGate>
      <TopBar subtitle="Live" />
      {body}
    </TeacherGate>
  );
}
