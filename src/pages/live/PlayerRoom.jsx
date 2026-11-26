import { useEffect, useRef, useState } from 'react';
import { celebrate } from '../../lib/confetti.js';
import { prefersReducedMotion } from '../../lib/settings.js';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { fetchResults, useAutoNext, useLiveRoom } from '../../lib/live.js';
import { feedSpacedReview } from '../../lib/liveReview.js';
import { ClinicalBadge, ReadingNote, TimerSticker, useQuestionClock, usePowerupLeft } from './LiveBits.jsx';
import CasePlay from './CasePlay.jsx';
import { CardSheet, CastPanel, EffectBanner, SpellBar } from './SpellBits.jsx';
import { PARALYSIS_MS, TACHYCARDIA_SHARE, scrambleText } from '../../lib/spells.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function Board({ board, myRank, myName }) {
  if (!board?.length) return null;
  return (
    <ol className="live-board">
      {board.map((r) => (
        <li key={`${r.rank}-${r.name}`} className={myName ? (r.name === myName ? 'is-me' : '') : (r.rank === myRank ? 'is-me' : '')}>
          <span className="live-board-rank">{r.rank}</span>
          <span className="live-board-name">{r.name}</span>
          <span className="live-board-score">{r.score}</span>
        </li>
      ))}
    </ol>
  );
}

function NameTeam({ team, act }) {
  const [editing, setEditing] = useState(team.name_status !== 'chosen');
  const [value, setValue] = useState(team.name_status === 'chosen' ? team.name : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (team.name_status === 'rejected') setEditing(true); }, [team.name_status]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await act('name_team', { name: value.trim() }); setEditing(false); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  if (!editing) {
    return (
      <p>Your team: <b>{team.name}</b> <button type="button" className="btn sm" onClick={() => { setValue(team.name); setEditing(true); }}>Change</button></p>
    );
  }
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
      <label className="field-label" htmlFor="live-team-name">Name your team</label>
      <input id="live-team-name" type="text" minLength={2} maxLength={24} autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="submit" className="btn primary" disabled={busy || value.trim().length < 2}>{busy ? 'Saving…' : 'Submit'}</button>
      {err ? <p className="form-error" role="alert">{err}</p> : null}
    </form>
  );
}

export default function PlayerRoom() {
  const { room: roomId } = useParams();
  const { state, error, offsetMs, connected, act, version } = useLiveRoom(roomId);
  const { user } = useAuth();
  const [sent, setSent] = useState(null); // { position, choice }
  const [voted, setVoted] = useState(null); // advisor's own pick: { position, choice }
  const [notice, setNotice] = useState('');
  const [sendError, setSendError] = useState('');
  const [pickBusy, setPickBusy] = useState(false);
  const [pickError, setPickError] = useState('');

  const r = state?.room;
  const q = state?.question;
  // Rooms hosted by a pass holder have a host, not a teacher.
  const who = r?.settings?.kind === 'student' ? 'host' : 'teacher';
  const { left, readLeft, reading, total } = useQuestionClock(r, offsetMs);
  const puLeft = usePowerupLeft(r, offsetMs);
  const autoIn = useAutoNext(state, offsetMs);

  useEffect(() => { setNotice(''); setSendError(''); }, [q?.position]);

  // Aphasia: the letters shuffle for half a second, then freeze scrambled.
  const aphasiaOn = state?.room?.stage === 'question' && (state?.spells?.effects || []).some((e) => e.spell === 'aphasia');
  const [shuffle, setShuffle] = useState(0);
  useEffect(() => {
    if (!aphasiaOn || prefersReducedMotion()) return undefined;
    let n = 1;
    setShuffle(n);
    const id = setInterval(() => { n += 1; if (n > 6) { clearInterval(id); setShuffle(0); } else setShuffle(n); }, 85);
    return () => { clearInterval(id); setShuffle(0); };
  }, [aphasiaOn, q?.position]);

  // A small burst of confetti when power-up cards are dealt, and at the end
  // for the top three (once each).
  const dealt = !!state?.spells?.cards;
  useEffect(() => { if (dealt) celebrate('burst'); }, [dealt]);
  const podiumDone = useRef(false);
  const myRank = state?.me?.rank;
  useEffect(() => {
    if (state?.room?.stage === 'finished' && myRank && myRank <= 3 && !podiumDone.current) { podiumDone.current = true; celebrate('podium'); }
  }, [state?.room?.stage, myRank]);

  // When the quiz ends, put this student's answers into their spaced review.
  const finished = r?.stage === 'finished';
  useEffect(() => {
    if (!finished || r?.settings?.mode === 'cases') return;
    fetchResults(roomId).then((res) => feedSpacedReview(roomId, res)).catch(() => {});
  }, [finished, roomId]);

  async function pick(choice) {
    if (!q) return;
    const team = state?.team;
    if (team && !team.am_captain) {
      // An advisor: suggest an answer, can change until the captain answers.
      if (team.answer || r?.stage !== 'question') return;
      const before = voted;
      setVoted({ position: q.position, choice });
      setSendError('');
      try {
        const out = await act('vote', { position: q.position, choice });
        if (out?.status === 'late') setNotice('Too late. Time was up.');
        else if (out?.status === 'closed') setNotice('This question is closed.');
        else if (out?.status === 'reading') setNotice('Answers are not open yet. Read the question.');
        else if (out?.status === 'captain') setNotice('You are the captain. Tap an answer to answer.');
      } catch (e) {
        setVoted(before);
        setSendError(e.message);
      }
      return;
    }
    if (sent?.position === q.position) return;
    setSent({ position: q.position, choice });
    setSendError('');
    try {
      const out = await act('answer', { position: q.position, choice });
      if (out?.status === 'late') setNotice('Too late. Time was up.');
      else if (out?.status === 'closed') setNotice('This question is closed.');
      else if (out?.status === 'reading') { setSent(null); setNotice('Answers are not open yet. Read the question.'); }
      else if (out?.status === 'not_captain') setNotice('Only the captain answers. Tap to suggest an answer.');
      else if (out?.status === 'paralyzed') { setSent(null); setNotice("You're paralysed for the first 5 seconds."); }
    } catch (e) {
      setSent(null);
      setSendError(e.message);
    }
  }

  async function pickSpell(index) {
    setPickBusy(true); setPickError('');
    try { await act('pick_spell', { index }); } catch (e) { setPickError(e.message); } finally { setPickBusy(false); }
  }

  if (error && !state) {
    const gone = error.status === 404 || error.status === 403;
    return (
      <main className="live-play"><div className="live-card">
        <h1>{gone ? "This room isn't available" : 'Could not open the room'}</h1>
        {gone ? null : <p>{error.message}</p>}
        <Link className="btn primary" to="/live">Back to Live</Link>
      </div></main>
    );
  }
  if (!state) return <main className="live-play"><p className="live-muted live-center">Loading…</p></main>;

  const me = state.me || {};
  if (me.kicked) {
    return (
      <main className="live-play"><div className="live-card">
        <h1>The {who} removed you from this room.</h1>
        <Link className="btn primary" to="/live">Back to Live</Link>
      </div></main>
    );
  }

  const stage = r.stage;
  const caseRoom = r.settings?.mode === 'cases';
  const team = (r.settings?.mode === 'teams' || caseRoom) && state.team ? state.team : null;
  const teamAnswer = team?.answer || null;
  const myId = user?.id;
  const votesFor = (i) => (team?.votes || []).filter((v) => v.choice === i).map((v) => v.shown);
  const myVote = team && !team.am_captain
    ? (q && voted?.position === q.position ? voted.choice : (team.votes || []).find((v) => v.user_id === myId)?.choice)
    : undefined;
  const captainName = team ? (team.members || []).find((m) => m.user_id === team.captain)?.shown || 'a teammate' : '';
  const teamBar = team ? (
    <div className="live-team-bar">
      <b>{team.name} · {team.score ?? 0} points · rank {team.rank} of {team.teams}</b>
      {stage === 'question' ? (
        <span>{team.am_captain ? 'You are the captain: your answer counts' : `Captain: ${captainName}. Tap to suggest an answer.`}</span>
      ) : null}
    </div>
  ) : null;
  const mine = me.answer || (q && sent?.position === q.position ? { choice: sent.choice } : null);

  // Power-ups (friends' rooms, individual mode): what is acting on this question.
  const sp = !team && !caseRoom ? state.spells || null : null;
  const fx = new Set(stage === 'question' ? (sp?.effects || []).map((e) => e.spell) : []);
  const hidden = new Set(stage === 'question' ? sp?.hide || [] : []);
  const tachy = fx.has('tachycardia');
  const shownTotal = tachy ? total * TACHYCARDIA_SHARE : total;
  const shownLeft = tachy ? Math.max(0, left - total * (1 - TACHYCARDIA_SHARE)) : left;
  const paralysedMs = fx.has('paralysis') && !r.paused ? Math.max(0, PARALYSIS_MS - (total - left)) : 0;
  const tx = (text) => (fx.has('aphasia') ? scrambleText(text, shuffle ? `${q ? q.position : ''}~${shuffle}` : (q ? q.position : '')) : text);

  let body = null;
  if (caseRoom && stage !== 'lobby') {
    body = <CasePlay roomId={roomId} version={version} act={act} myId={myId} team={team} />;
  } else if (stage === 'lobby') {
    const mates = team ? (team.members || []).filter((m) => m.user_id !== myId).map((m) => m.shown) : [];
    body = (
      <div className="live-card">
        <h1>You're in!</h1>
        <p>Waiting for the {who} to start.</p>
        <p className="live-big-name">{me.nickname || 'No nickname'}</p>
        {team ? (
          <>
            {team.name_status === 'rejected' ? (
              <p className="form-error" role="alert">
                {team.am_namer ? `The ${who} rejected your team name. Choose another one.` : `The ${who} rejected your team name. ${team.namer_name || 'A teammate'} will choose another.`}
              </p>
            ) : null}
            <p>You're in {team.name}{mates.length ? ` with ${mates.join(', ')}` : ''}</p>
            {team.am_namer ? <NameTeam team={team} act={act} />
              : team.name_status === 'chosen' ? <p>Your team: <b>{team.name}</b></p>
                : <p className="live-muted">Waiting for {team.namer_name || 'a teammate'} to name your team</p>}
          </>
        ) : null}
        <p className="live-muted">{state.players} {state.players === 1 ? 'player' : 'players'} in the room</p>
      </div>
    );
  } else if (stage === 'question' && q) {
    const advisor = !!team && !team.am_captain;
    const answered = team ? !!teamAnswer || (!advisor && !!mine) : !!mine;
    const chosen = (i) => (advisor ? myVote === i : mine?.choice === i);
    const captainChose = teamAnswer && !teamAnswer.auto ? teamAnswer.choice : null;
    body = (
      <div className={`lv-fx${fx.has('cataract') ? ' lv-fx-cataract' : ''}`}>
        <div className="live-q-top">
          <span>Question {r.current + 1} of {r.total}</span>
          <span className={tachy ? 'lv-heartbeat' : undefined}><TimerSticker msLeft={reading ? shownTotal : shownLeft} totalMs={shownTotal} paused={r.paused} size="sm" /></span>
        </div>
        <ClinicalBadge question={q} settings={r.settings} />
        {reading ? <ReadingNote msLeft={readLeft} /> : null}
        {r.paused ? <p className="live-paused">Paused by the {who}</p> : null}
        <EffectBanner effects={sp?.effects} />
        {tachy ? <p className="lv-badge">Tachycardia: 60% of the time</p> : null}
        {fx.has('double_or_nothing') ? <p className="lv-badge">Double or nothing</p> : null}
        <div className="lv-qwrap">
          <h1 className="live-q-text">{tx(q.q)}</h1>
          {fx.has('scotoma') ? <span className="lv-scotoma" aria-hidden="true" /> : null}
        </div>
        {q.image ? <img className="live-q-img" src={q.image} alt="" /> : null}
        {reading ? null : <div className={`live-options${paralysedMs > 0 ? ' is-frozen' : ''}`} style={paralysedMs > 0 ? { '--frost': paralysedMs / PARALYSIS_MS } : undefined}>
          {q.options.map((o, i) => (hidden.has(i) ? null : (
            <button key={i} type="button" className={`live-opt c${i % 4}${chosen(i) ? ' is-chosen' : ''}`}
                    disabled={answered || r.paused || paralysedMs > 0 || (tachy && shownLeft <= 0)} onClick={() => pick(i)}>
              <b>{LETTERS[i]}</b>
              {team ? (
                <span className="live-opt-text">
                  <span>{tx(o)}</span>
                  {votesFor(i).length ? <span className="live-opt-picks">{votesFor(i).join(', ')}</span> : null}
                </span>
              ) : <span>{tx(o)}</span>}
            </button>
          )))}
        </div>}
        {!reading && paralysedMs > 0 ? <p className="live-status" role="status">Paralysed: you can answer in {Math.ceil(paralysedMs / 1000)} s</p> : null}
        {team && advisor && captainChose != null ? <p className="live-status" role="status">Captain chose {LETTERS[captainChose]}</p> : null}
        {team && advisor && captainChose == null && myVote != null ? <p className="live-status" role="status">{notice || 'Suggestion sent. You can change it until the captain answers.'}</p> : null}
        {team && !advisor && answered ? <p className="live-status" role="status">{notice || 'Answer sent for your team. Wait for the reveal.'}</p> : null}
        {!reading && !team && answered ? <p className="live-status" role="status">{notice || 'Answer sent. Wait for the reveal.'}</p> : null}
        {team && notice && !answered && myVote == null ? <p className="live-status" role="status">{notice}</p> : null}
        {sendError ? <p className="form-error" role="alert">{sendError}</p> : null}
      </div>
    );
  } else if (stage === 'reveal' && q) {
    const ans = team ? teamAnswer : me.answer;
    const correct = state.reveal?.answer;
    const teamText = (a) => (a.correct === undefined ? 'Checking…'
      : a.correct ? `Correct! +${a.points ?? 0} points for ${team.name}${a.auto ? " (your advisors' pick)" : ''}`
        : `Not this time${a.auto ? " (your advisors' pick)" : ''}`);
    body = (
      <>
        <div className="live-q-top"><span>Question {r.current + 1} of {r.total}</span></div>
        <h1 className="live-q-text">{q.q}</h1>
        {/* Right after the reveal event the answer has no verdict yet (it
            arrives with the next state read, a moment later). */}
        <div className={`live-result ${ans ? (ans.correct === undefined ? 'none' : ans.correct ? 'ok' : 'bad') : 'none'}`} role="status">
          {ans
            ? (team ? teamText(ans) : ans.correct === undefined ? 'Checking…' : ans.correct ? `Correct! +${ans.points ?? 0} points` : 'Not this time. 0 points')
            : (team ? "Your team didn't answer" : 'You did not answer')}
          {team
            ? <span>{team.score ?? 0} points · rank {team.rank} of {team.teams}</span>
            : <span>{me.score ?? 0} points{me.rank ? ` · rank ${me.rank}` : ''}</span>}
        </div>
        <div className="live-options">
          {q.options.map((o, i) => (
            <div key={i} className={`live-opt c${i % 4} static${i === correct ? ' is-correct' : ''}${ans?.choice === i && i !== correct ? ' is-wrong' : ''}${ans?.choice === i ? ' is-chosen' : ''}`}>
              <b>{LETTERS[i]}</b><span>{o}</span>
            </div>
          ))}
        </div>
        {state.reveal?.explanation ? <p className="live-expl">{state.reveal.explanation}</p> : null}
        {autoIn != null ? <p className="live-muted live-center" role="status">Next question in {autoIn} s</p> : null}
      </>
    );
  } else if (stage === 'leaderboard') {
    body = (
      <div className="live-card">
        <h1>Leaderboard</h1>
        <Board board={state.board} myRank={me.rank} myName={team?.name} />
        {team
          ? <p className="live-muted">Your team: rank {team.rank} of {team.teams} · {team.score ?? 0} points</p>
          : <p className="live-muted">You: {me.score ?? 0} points{me.rank ? ` · rank ${me.rank}` : ''}</p>}
        {autoIn != null ? <p className="live-muted" role="status">Next question in {autoIn} s</p> : null}
      </div>
    );
  } else if (stage === 'finished') {
    body = (
      <div className="live-card">
        <h1>Finished</h1>
        <p className="live-final">{me.score ?? 0} points{team ? '' : me.rank ? ` · rank ${me.rank} of ${state.players}` : ''}</p>
        {team ? <p>Your team: rank {team.rank} of {team.teams}</p> : null}
        <p className="live-muted">{me.correct ?? 0} correct of {r.total}</p>
        <Board board={state.board} myRank={me.rank} myName={team?.name} />
        <Link className="btn primary block" to={`/live/results/${roomId}`}>See your results</Link>
      </div>
    );
  } else {
    body = <div className="live-card"><p>Waiting for the {who}…</p></div>;
  }

  return (
    <main className="live-play">
      {!connected ? <div className="live-reconnect" role="status">Reconnecting…</div> : null}
      <header className="live-play-head">
        <span className="live-play-nick">{me.nickname || 'You'}</span>
        {caseRoom ? null : <span className="live-play-score">{me.score ?? 0} points</span>}
      </header>
      {stage !== 'lobby' && !caseRoom ? teamBar : null}
      {sp && stage !== 'finished' ? <SpellBar spells={sp} /> : null}
      {/* Casting comes first between questions, where it can't be missed. */}
      {sp && puLeft > 0 ? <p className="lv-pu-note" role="status">Power-up time · {puLeft} s — use your power-up now</p> : null}
      {sp && (stage === 'reveal' || stage === 'leaderboard') ? <CastPanel spells={sp} act={act} /> : null}
      {body}
      {sp?.cards ? <CardSheet cards={sp.cards} onPick={pickSpell} busy={pickBusy} error={pickError} /> : null}
    </main>
  );
}
