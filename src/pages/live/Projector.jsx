import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAutoNext, useCaseView, useLiveRoom } from '../../lib/live.js';
import { ClinicalBadge, CodeTag, ReadingNote, TimerSticker, useQuestionClock, usePowerupLeft } from './LiveBits.jsx';
import { celebrate } from '../../lib/confetti.js';
import { CastList, spellEventText } from './SpellBits.jsx';
import { playSpellFx } from '../../lib/spellFx.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const spaced = (code) => (code || '').replace(/^(\d{3})(\d{3})$/, '$1 $2');

function QrCode({ text }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let off = false;
    QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
      .then((s) => { if (!off) setSvg(s); })
      .catch(() => { if (!off) setSvg(''); });
    return () => { off = true; };
  }, [text]);
  if (!svg) return null;
  return <div className="proj-qr" role="img" aria-label="QR code to join" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function topPlayers(roster, n) {
  return [...(roster || [])].sort((a, b) => b.score - a.score).slice(0, n);
}

export default function Projector() {
  const { room: roomId } = useParams();
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  // The stage when a spell event arrives (the event handler outlives renders).
  const stageRef = useRef(null);
  const showSpell = (p) => {
    const text = spellEventText(p);
    if (!text) return;
    // Effects play between questions only, never over a question.
    if (stageRef.current !== 'question') playSpellFx(p);
    clearTimeout(toastTimer.current);
    setToast({ text, kind: p.blocked ? 'blocked' : p.spell === 'point_steal' && p.amount > 0 ? 'steal' : 'cast', amount: p.amount, by: p.by, target: p.target, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  // Confetti once when a game ends on the big screen.
  const confettiDone = useRef(false);
  // Demo pages (no realtime) send the same event by hand.
  useEffect(() => {
    if (!(import.meta.env.DEV || import.meta.env.VITE_LIVE_DEMO === '1')) return undefined;
    const on = (e) => showSpell(e.detail);
    window.addEventListener('live-demo-spell', on);
    return () => window.removeEventListener('live-demo-spell', on);
  }, []);
  const { state, error, offsetMs, version } = useLiveRoom(roomId, { asHost: true, onEvent: (event, payload) => { if (event === 'spell') showSpell(payload); } });
  const caseRoom = state?.room?.settings?.mode === 'cases';
  const { cases: caseView } = useCaseView(caseRoom ? roomId : null, version);
  const r = state?.room;
  stageRef.current = r?.stage || null;
  const { left, readLeft, reading, total: answerMs } = useQuestionClock(r, offsetMs);
  const puLeft = usePowerupLeft(r, offsetMs);
  const autoIn = useAutoNext(state, offsetMs);

  if (error && !state) {
    return <main className="proj"><div className="proj-center"><h1>This room isn't available</h1></div></main>;
  }
  if (!state) return <main className="proj"><div className="proj-center"><p>Loading…</p></div></main>;

  const stage = r.stage;
  if (stage === 'finished' && !confettiDone.current && !caseRoom) { confettiDone.current = true; setTimeout(() => celebrate('podium'), 300); }
  const q = state.question;
  const hidden = r.settings?.leaderboard === 'none';
  const roster = state.roster || [];
  const teamRoom = r.settings?.mode === 'teams' || caseRoom;
  const teams = state.teams || [];
  const rankedTeams = [...teams].sort((a, b) => a.rank - b.rank || b.score - a.score);
  let body = null;

  if (stage === 'lobby') {
    const joinUrl = `${window.location.origin}/live?code=${r.code}`;
    body = (
      <div className="proj-lobby">
        <CodeTag code={r.code}><QrCode text={joinUrl} /></CodeTag>
        <div className="proj-lobby-info">
          <p className="proj-title">{r.title}</p>
          <p className="proj-count">{state.players} {state.players === 1 ? 'player' : 'players'} joined</p>
        </div>
        {teamRoom && teams.length ? (
          <ul className="proj-teams">
            {[...teams].sort((a, b) => a.no - b.no).map((t) => (
              <li key={t.no}><b>{t.name}</b><span>{t.members.map((m) => m.shown).join(', ')}</span></li>
            ))}
          </ul>
        ) : (
          <ul className="proj-names">
            {roster.map((p) => <li key={p.user_id}>{p.shown}</li>)}
          </ul>
        )}
      </div>
    );
  } else if (caseRoom && (stage === 'cases' || stage === 'finished')) {
    const total = caseView?.total ?? 0;
    const board = [...(caseView?.teams || [])].sort((a, b) => a.no - b.no);
    body = (
      <div className="proj-center">
        <h1 className="proj-h">{stage === 'finished' ? 'Thanks for playing' : r.title}</h1>
        {stage === 'finished' ? null : <p className="proj-label">Cases in progress</p>}
        <ol className="proj-progress">
          {board.map((t) => {
            const finished = total > 0 && t.done >= total;
            return (
              <li key={t.no}>
                <b>{t.name}</b>
                <span className="proj-pbar" role="progressbar" aria-label={`${t.name} progress`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={t.done}>
                  <i style={{ width: `${total ? Math.min(100, (t.done / total) * 100) : 0}%` }} />
                </span>
                <u>{finished ? '✓' : `${t.done}/${total}`}</u>
              </li>
            );
          })}
        </ol>
      </div>
    );
  } else if ((stage === 'question' || stage === 'reveal') && q) {
    const isReveal = stage === 'reveal';
    const reveal = state.reveal;
    const by = reveal?.counts?.by_option || {};
    const maxPick = Math.max(1, ...q.options.map((_, i) => by[i] || 0));
    body = (
      <div className="proj-question">
        <div className="proj-q-top">
          <span>Question {r.current + 1} of {r.total}</span>
          {isReveal ? (
            <span>{reveal?.counts?.answered ?? 0} of {teamRoom ? teams.length : state.players} {teamRoom ? 'teams ' : ''}answered</span>
          ) : (
            <span className="proj-timewrap">
              <ClinicalBadge question={q} settings={r.settings} size="big" />
              <TimerSticker msLeft={reading ? answerMs : left} totalMs={answerMs} paused={r.paused} />
            </span>
          )}
        </div>
        <h1 className="proj-q-text">{q.q}</h1>
        {q.image ? <img className="proj-q-img" src={q.image} alt="" /> : null}
        {!isReveal && reading ? <ReadingNote msLeft={readLeft} size="big" /> : null}
        {!isReveal && reading ? null : <div className="proj-options">
          {q.options.map((o, i) => {
            const cls = isReveal ? (i === reveal?.answer ? ' is-correct' : ' is-dim') : '';
            return (
              <div key={i} className={`proj-opt c${i % 4}${cls}`}>
                <b>{LETTERS[i]}</b><span>{o}</span>
                {isReveal ? (
                  <em className="proj-pick">
                    <i style={{ width: `${((by[i] || 0) / maxPick) * 100}%` }} />
                    <u>{by[i] || 0}</u>
                  </em>
                ) : null}
              </div>
            );
          })}
        </div>}
        {isReveal ? (
          <>
            {reveal?.explanation ? <p className="proj-expl">{reveal.explanation}</p> : null}
            <CastList casts={state.casts} big />
            {autoIn != null ? <p className="proj-answered">Next question in {autoIn} s</p> : null}
          </>
        ) : reading ? null : (
          <p className="proj-answered">{state.counts?.answered ?? 0} of {teamRoom ? teams.length : state.players} {teamRoom ? 'teams ' : ''}answered</p>
        )}
        {r.paused && !isReveal ? <div className="proj-paused"><span>Paused</span></div> : null}
      </div>
    );
  } else if (stage === 'leaderboard') {
    body = (
      <div className="proj-center">
        <h1 className="proj-h">Leaderboard</h1>
        {hidden ? <p className="proj-label">Leaderboard hidden by the {r.settings?.kind === 'student' ? 'host' : 'teacher'}</p> : (
          <ol className="proj-board">
            {teamRoom ? rankedTeams.slice(0, 5).map((t) => (
              <li key={t.no}><span>{t.rank}</span><b>{t.name}</b><u>{t.score}</u></li>
            )) : topPlayers(roster, 5).map((p, i) => (
              <li key={p.user_id}><span>{i + 1}</span><b>{p.shown}</b><u>{p.score}</u></li>
            ))}
          </ol>
        )}
        <CastList casts={state.casts} big />
      </div>
    );
  } else if (stage === 'finished') {
    const top = teamRoom
      ? rankedTeams.slice(0, 3).map((t) => ({ user_id: `team-${t.no}`, shown: t.name, score: t.score }))
      : topPlayers(roster, 3);
    // Podium order: 2nd, 1st, 3rd.
    const order = [top[1], top[0], top[2]].map((p, i) => p && { p, place: [2, 1, 3][i] });
    body = (
      <div className="proj-center">
        <h1 className="proj-h">Thanks for playing</h1>
        {hidden ? <p className="proj-label">Results are hidden by the {r.settings?.kind === 'student' ? 'host' : 'teacher'}</p> : (
          <div className="proj-podium">
            {order.filter(Boolean).map(({ p, place }) => (
              <div key={p.user_id} className={`proj-step place${place}`}>
                <b>{p.shown}</b>
                <u>{p.score}</u>
                <span>{place}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else {
    body = <div className="proj-center"><p>Waiting…</p></div>;
  }

  return (
    <main className="proj">
      {body}
      {puLeft > 0 ? <div className="proj-pu" role="status">Power-up time <b>{puLeft}</b></div> : null}
      {toast && stage !== 'question' ? (
        <div key={toast.key} className={`proj-toast is-${toast.kind}${puLeft > 0 ? ' has-pu' : ''}`} role="status">
          <p>{toast.text}</p>
          {toast.kind === 'steal' ? (
            <div className="proj-steal" aria-hidden="true">
              <span className="is-minus">{toast.target} −{toast.amount}</span>
              <span className="is-plus">{toast.by} +{toast.amount}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
