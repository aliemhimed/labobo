import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import Dialog from '../../components/Dialog.jsx';
import { useConfirm } from '../../components/Confirm.jsx';
import { useAutoNext, useCountdown, useLiveRoom } from '../../lib/live.js';
import { CodeTag } from './LiveBits.jsx';
import TeacherGate from './TeacherGate.jsx';
import CaseHost from './CaseHost.jsx';
import '../../styles/live-teach.css';

const spaced = (code) => (code && code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code || '');
const seconds = (ms) => Math.ceil(ms / 1000);

function RenameDialog({ player, onSave, onClose }) {
  const [value, setValue] = useState(player.shown || player.nickname || '');
  return (
    <Dialog onClose={onClose} labelledBy="lt-rename-title">
      <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSave(value.trim()); }}>
        <h2 id="lt-rename-title">Rename {player.name || 'student'}</h2>
        <p className="dialog-text">This changes the nickname everyone sees.</p>
        <label className="field-label" htmlFor="lt-rename">New nickname</label>
        <input id="lt-rename" className="lt-input" value={value} maxLength={24} onChange={(e) => setValue(e.target.value)} />
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!value.trim()}>Save</button>
        </div>
      </form>
    </Dialog>
  );
}

function Roster({ roster, showAnswered, onKick, onRename }) {
  if (!roster.length) return <p className="lt-muted">No students have joined yet.</p>;
  return (
    <div className="lt-table-wrap">
      <table className="lt-table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Nickname</th><th>Score</th><th>Correct</th>
            {showAnswered ? <th>Answered</th> : null}<th>Online</th><th>Away</th><th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {roster.map((p) => (
            <tr key={p.user_id}>
              <td>{p.name}</td>
              <td>{p.email}</td>
              <td>{p.nickname}</td>
              <td className="num">{p.score}</td>
              <td className="num">{p.correct}</td>
              {showAnswered ? <td>{p.answered ? <span aria-label="Answered">✓</span> : <span className="lt-muted" aria-label="Not answered">–</span>}</td> : null}
              <td><span className={`lt-dot${p.online ? ' on' : ''}`} aria-hidden="true" />{p.online ? 'Online' : 'Offline'}</td>
              <td>{p.away > 0 ? <span className="lt-away">left app ×{p.away}</span> : ''}</td>
              <td>
                <div className="lt-row-actions">
                  <button type="button" className="btn sm" onClick={() => onRename(p)}>Rename</button>
                  <button type="button" className="btn sm" onClick={() => onKick(p)}>Kick</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamList({ teams, onMove, onReject, disabled }) {
  return (
    <ul className="lt-list">
      {teams.map((t) => (
        <li key={t.no} className="lt-row" style={{ display: 'grid', gap: 6 }}>
          <div className="lt-row-title">
            {t.name}
            {onReject && t.name !== `Team ${t.no}` ? (
              <button type="button" className="btn sm" style={{ marginLeft: 10 }} disabled={disabled} onClick={() => onReject(t)}>Reject name</button>
            ) : null}
          </div>
          <ul className="lt-team-members">
            {t.members.map((m) => (
              <li key={m.user_id}>
                <span>{m.name || m.shown}{m.shown && m.name && m.shown !== m.name ? ` (${m.shown})` : ''}</span>
                {onMove && teams.length > 1 ? (
                  <select className="lt-input lt-move" aria-label={`Move ${m.name || m.shown} to another team`} disabled={disabled} value=""
                          onChange={(e) => { if (e.target.value) onMove(m, Number(e.target.value)); }}>
                    <option value="">Move to…</option>
                    {teams.filter((o) => o.no !== t.no).map((o) => <option key={o.no} value={o.no}>{o.name}</option>)}
                  </select>
                ) : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function TeamsPanel({ teams, stage }) {
  const sorted = [...teams].sort((a, b) => a.no - b.no);
  const asking = stage === 'question';
  const answered = teams.filter((t) => t.answered).length;
  return (
    <section className="lt-card" aria-labelledby="lt-teams">
      <h2 id="lt-teams" style={{ fontSize: 'var(--t-21)', marginBottom: 10 }}>Teams ({teams.length})</h2>
      {asking ? <p className="lt-sub" style={{ marginBottom: 10 }}>Answered {answered} of {teams.length} teams</p> : null}
      <div className="lt-table-wrap">
        <table className="lt-table">
          <thead>
            <tr><th>Team</th><th>Captain</th>{asking ? <th>Answer</th> : null}<th>Score</th><th>Correct</th><th>Rank</th></tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const cap = t.members.find((m) => m.user_id === t.captain);
              return (
                <tr key={t.no}>
                  <td>{t.name}</td>
                  <td>{cap ? (cap.name || cap.shown) : ''}</td>
                  {asking ? <td>{t.answered ? <span aria-label="Answered">✓</span> : <span className="lt-muted">Waiting</span>}</td> : null}
                  <td className="num">{t.score}</td>
                  <td className="num">{t.correct}</td>
                  <td className="num">{t.rank}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QuestionCard({ state, left }) {
  const { room, question, reveal } = state;
  const answered = (reveal?.counts || state.counts)?.answered ?? 0;
  const teamRoom = room.settings?.mode === 'teams' && Array.isArray(state.teams);
  const total = teamRoom ? state.teams.length : (state.players || 0);
  const unit = teamRoom ? 'teams' : '';
  const by = (reveal?.counts || state.counts)?.by_option || {};
  const open = room.stage === 'question';
  const options = question?.options || [];
  return (
    <section className="lt-card" aria-label="Current question">
      <p className="lt-sub">Question {room.current + 1} of {room.total}</p>
      <h2 style={{ margin: '6px 0 12px' }}>{question?.q}</h2>
      {question?.image ? <img src={question.image} alt="" style={{ maxWidth: '100%', maxHeight: 220, marginBottom: 12 }} /> : null}
      {open ? (
        <div className="lt-grid" style={{ marginBottom: 12 }}>
          <div className="lt-time" aria-live="off">{room.paused ? 'Paused · ' : ''}{seconds(left)} s</div>
          <div>
            <div>Answered {answered} of {total}{unit ? ` ${unit}` : ''}</div>
            <div className="lt-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
              <i style={{ width: `${total ? Math.min(100, (answered / total) * 100) : 0}%` }} />
            </div>
          </div>
        </div>
      ) : null}
      <ul className="lt-dist">
        {options.map((o, i) => {
          const n = by[String(i)] || 0;
          const right = !open && reveal && reveal.answer === i;
          return (
            <li key={i} className={`c${i % 4}${right ? ' right' : ''}${!open && reveal && !right ? ' dim' : ''}`}>
              <span><em className="lt-letter">{'ABCDEF'[i]}</em>{o}{right ? ' (correct)' : ''}</span>
              {!open && reveal ? <b>{n}</b> : null}
              {!open && reveal ? <div className="lt-bar"><i style={{ width: `${answered ? (n / answered) * 100 : 0}%` }} /></div> : null}
            </li>
          );
        })}
      </ul>
      {!open && reveal?.explanation ? <p style={{ marginTop: 12 }}><b>Explanation:</b> {reveal.explanation}</p> : null}
    </section>
  );
}

function Room({ roomId }) {
  const { state, error, offsetMs, connected, refresh, act, version } = useLiveRoom(roomId, { asHost: true });
  const { confirm, element: confirmElement } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [renaming, setRenaming] = useState(null);
  const room = state?.room;
  const left = useCountdown(room?.deadline, offsetMs, room?.paused, room?.paused_left_ms);
  const autoIn = useAutoNext(state, offsetMs);

  const run = async (fn) => {
    setBusy(true); setProblem('');
    try { await fn(); } catch (e) { setProblem(e.message); } finally { setBusy(false); }
  };
  const moderate = (extra) => run(() => act('moderate', extra));

  if (!state) {
    return (
      <main id="main" tabIndex={-1} className="lt">
        {error ? (
          <div className="lt-state" role="alert">
            <h1>Could not open this room</h1>
            <p className="lt-sub">{error.message}</p>
            <button type="button" className="btn primary" onClick={refresh}>Try again</button>
            <Link className="btn" to="/live/teach">Back</Link>
          </div>
        ) : <p className="lt-muted" role="status">Loading…</p>}
      </main>
    );
  }

  const caseRoom = room.settings?.mode === 'cases';
  const teamRoom = room.settings?.mode === 'teams' || caseRoom;
  const teams = state.teams || [];
  const last = room.current >= room.total - 1;
  const next = <button type="button" className="btn primary" disabled={busy} onClick={() => run(() => act('next'))}>{last ? 'Finish' : 'Next question'}</button>;
  const stage = room.stage;
  // Auto mode: say when the next question starts, and let the teacher hold it.
  const autoBits = room.settings?.advance === 'auto' && (stage === 'reveal' || stage === 'leaderboard') ? (
    <>
      <button type="button" className="btn" disabled={busy} onClick={() => run(() => act('pause', { paused: !room.paused }))}>{room.paused ? 'Resume' : 'Hold'}</button>
      <span className="lt-sub" role="status">{room.paused ? 'Held. Resume to continue.' : autoIn != null ? `Next question in ${autoIn} s` : last ? 'Finishing…' : ''}</span>
    </>
  ) : null;

  return (
    <main id="main" tabIndex={-1} className="lt">
      {confirmElement}
      {renaming ? (
        <RenameDialog player={renaming} onClose={() => setRenaming(null)}
                      onSave={(value) => { const u = renaming.user_id; setRenaming(null); moderate({ act: 'rename', user: u, value }); }} />
      ) : null}

      <div className="lt-head">
        <div>
          <h1>{room.title}</h1>
          <CodeTag code={room.code} size="sm" />
        </div>
        <div className="lt-grid" style={{ justifyItems: 'start' }}>
          <button type="button" className="btn" onClick={() => window.open(`/live/screen/${roomId}`, '_blank', 'noopener')}>Open projector view</button>
          <span className="lt-sub" role="status"><span className={`lt-dot${connected ? ' on' : ''}`} aria-hidden="true" />{connected ? 'Connected' : 'Reconnecting…'}</span>
        </div>
      </div>

      {error ? <p className="lt-error" role="alert">Could not refresh: {error.message}</p> : null}
      {problem ? <p className="lt-error" role="alert">{problem}</p> : null}

      <div className="lt-grid">
        <div className="lt-card">
          <div className="lt-controls">
            {stage === 'lobby' ? (
              <>
                <button type="button" className="btn primary lg" disabled={busy} onClick={() => run(() => act('next'))}>{caseRoom ? 'Start cases' : 'Start quiz'}</button>
                {teamRoom ? (
                  <button type="button" className="btn" disabled={busy || state.players < 2} onClick={() => run(() => act('make_teams'))}>
                    {teams.length ? 'Reshuffle teams' : 'Make teams'}
                  </button>
                ) : null}
                <span className="lt-sub">{state.players} {state.players === 1 ? 'student' : 'students'} joined</span>
              </>
            ) : null}
            {stage === 'question' ? (
              <>
                <button type="button" className="btn primary" disabled={busy} onClick={() => run(() => act('close'))}>End question now</button>
                <button type="button" className="btn" disabled={busy} onClick={() => run(() => act('pause', { paused: !room.paused }))}>{room.paused ? 'Resume' : 'Pause'}</button>
              </>
            ) : null}
            {stage === 'reveal' ? (
              <>
                <button type="button" className="btn" disabled={busy} onClick={() => run(() => act('board'))}>Show leaderboard</button>
                {next}
                {autoBits}
              </>
            ) : null}
            {stage === 'leaderboard' ? <>{next}{autoBits}</> : null}
            {stage === 'finished' && !caseRoom ? <Link className="btn primary" to={`/live/results/${roomId}`}>See results</Link> : null}
            {stage !== 'finished' ? (
              <>
                <button type="button" className="btn" disabled={busy}
                        onClick={() => run(() => act('moderate', { act: 'lock', value: !room.locked }))}>
                  {room.locked ? 'Unlock room' : 'Lock room'}
                </button>
                {caseRoom ? null : <button type="button" className="btn danger" disabled={busy}
                        onClick={async () => {
                          const ok = await confirm({ title: 'End the quiz now?', message: 'The room closes and students see their final scores.', confirmLabel: 'End quiz', danger: true });
                          if (ok) run(() => act('finish'));
                        }}>End quiz</button>}
              </>
            ) : null}
          </div>
          {room.locked && stage !== 'finished' ? <p className="lt-muted" style={{ marginTop: 8 }}>The room is locked. New students cannot join.</p> : null}
          {stage === 'leaderboard' ? <p className="lt-muted" style={{ marginTop: 8 }}>The leaderboard is showing.</p> : null}
        </div>

        {teamRoom && stage === 'lobby' ? (
          <section className="lt-card" aria-labelledby="lt-teamlist">
            <h2 id="lt-teamlist" style={{ fontSize: 'var(--t-21)', marginBottom: 10 }}>Teams{teams.length ? ` (${teams.length})` : ''}</h2>
            {teams.length ? (
              <TeamList teams={teams} disabled={busy}
                        onReject={(t) => run(() => act('reject_team_name', { team: t.no }))}
                        onMove={(m, no) => moderate({ act: 'move', user: m.user_id, value: no })} />
            ) : <p className="lt-muted">No teams yet. Press Make teams when the students have joined, or teams are made when you start.</p>}
          </section>
        ) : null}

        {teamRoom && !caseRoom && stage !== 'lobby' && teams.length ? <TeamsPanel teams={teams} stage={stage} /> : null}

        {caseRoom && (stage === 'cases' || stage === 'finished') ? <CaseHost roomId={roomId} version={version} act={act} busy={busy} run={run} confirm={confirm} /> : null}

        {stage === 'question' || stage === 'reveal' || stage === 'leaderboard' ? <QuestionCard state={state} left={left} /> : null}

        <section className="lt-card" aria-labelledby="lt-roster">
          <h2 id="lt-roster" style={{ fontSize: 'var(--t-21)', marginBottom: 10 }}>Students ({state.players})</h2>
          <Roster roster={state.roster || []} showAnswered={stage === 'question'}
                  onRename={setRenaming}
                  onKick={async (p) => {
                    const ok = await confirm({ title: `Remove ${p.name || 'this student'}?`, message: 'They are removed from the room and cannot join again.', confirmLabel: 'Kick', danger: true });
                    if (ok) moderate({ act: 'kick', user: p.user_id });
                  }} />
        </section>
      </div>
    </main>
  );
}

export default function HostRoom() {
  const { room } = useParams();
  return (
    <TeacherGate>
      <TopBar subtitle="Live" />
      <Room roomId={room} />
    </TeacherGate>
  );
}
