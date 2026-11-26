import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchResults, useAutoNext, useCountdown, useLiveRoom } from '../../lib/live.js';
import { feedSpacedReview } from '../../lib/liveReview.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function Board({ board, myRank }) {
  if (!board?.length) return null;
  return (
    <ol className="live-board">
      {board.map((r) => (
        <li key={`${r.rank}-${r.name}`} className={r.rank === myRank ? 'is-me' : ''}>
          <span className="live-board-rank">{r.rank}</span>
          <span className="live-board-name">{r.name}</span>
          <span className="live-board-score">{r.score}</span>
        </li>
      ))}
    </ol>
  );
}

export default function PlayerRoom() {
  const { room: roomId } = useParams();
  const { state, error, offsetMs, connected, act } = useLiveRoom(roomId);
  const [sent, setSent] = useState(null); // { position, choice }
  const [notice, setNotice] = useState('');
  const [sendError, setSendError] = useState('');

  const r = state?.room;
  const q = state?.question;
  const left = useCountdown(r?.deadline, offsetMs, r?.paused, r?.paused_left_ms);
  const autoIn = useAutoNext(state, offsetMs);

  useEffect(() => { setNotice(''); setSendError(''); }, [q?.position]);

  // When the quiz ends, put this student's answers into their spaced review.
  const finished = r?.stage === 'finished';
  useEffect(() => {
    if (!finished) return;
    fetchResults(roomId).then((res) => feedSpacedReview(roomId, res)).catch(() => {});
  }, [finished, roomId]);

  async function pick(choice) {
    if (!q || sent?.position === q.position) return;
    setSent({ position: q.position, choice });
    setSendError('');
    try {
      const out = await act('answer', { position: q.position, choice });
      if (out?.status === 'late') setNotice('Too late. Time was up.');
      else if (out?.status === 'closed') setNotice('This question is closed.');
    } catch (e) {
      setSent(null);
      setSendError(e.message);
    }
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
        <h1>The teacher removed you from this room.</h1>
        <Link className="btn primary" to="/live">Back to Live</Link>
      </div></main>
    );
  }

  const stage = r.stage;
  const mine = me.answer || (q && sent?.position === q.position ? { choice: sent.choice } : null);
  const total = Math.max(1, (r.settings?.seconds || 20) * 1000);
  const pct = Math.min(100, (left / total) * 100);

  let body = null;
  if (stage === 'lobby') {
    body = (
      <div className="live-card">
        <h1>You're in!</h1>
        <p>Waiting for the teacher to start.</p>
        <p className="live-big-name">{me.nickname || 'No nickname'}</p>
        <p className="live-muted">{state.players} {state.players === 1 ? 'player' : 'players'} in the room</p>
      </div>
    );
  } else if (stage === 'question' && q) {
    const answered = !!mine;
    body = (
      <>
        <div className="live-q-top">
          <span>Question {r.current + 1} of {r.total}</span>
          <span className="live-secs">{r.paused ? 'Paused' : `${Math.ceil(left / 1000)} s`}</span>
        </div>
        <div className="live-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        {r.paused ? <p className="live-paused">Paused by the teacher</p> : null}
        <h1 className="live-q-text">{q.q}</h1>
        {q.image ? <img className="live-q-img" src={q.image} alt="" /> : null}
        <div className="live-options">
          {q.options.map((o, i) => (
            <button key={i} type="button" className={`live-opt c${i % 4}${mine?.choice === i ? ' is-chosen' : ''}`}
                    disabled={answered || r.paused} onClick={() => pick(i)}>
              <b>{LETTERS[i]}</b><span>{o}</span>
            </button>
          ))}
        </div>
        {answered ? <p className="live-status" role="status">{notice || 'Answer sent. Wait for the reveal.'}</p> : null}
        {sendError ? <p className="form-error" role="alert">{sendError}</p> : null}
      </>
    );
  } else if (stage === 'reveal' && q) {
    const ans = me.answer;
    const correct = state.reveal?.answer;
    body = (
      <>
        <div className="live-q-top"><span>Question {r.current + 1} of {r.total}</span></div>
        <h1 className="live-q-text">{q.q}</h1>
        {/* Right after the reveal event the answer has no verdict yet (it
            arrives with the next state read, a moment later). */}
        <div className={`live-result ${ans ? (ans.correct === undefined ? 'none' : ans.correct ? 'ok' : 'bad') : 'none'}`} role="status">
          {ans
            ? (ans.correct === undefined ? 'Checking…' : ans.correct ? `Correct! +${ans.points ?? 0} points` : 'Not this time. 0 points')
            : 'You did not answer'}
          <span>{me.score ?? 0} points{me.rank ? ` · rank ${me.rank}` : ''}</span>
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
        <Board board={state.board} myRank={me.rank} />
        <p className="live-muted">You: {me.score ?? 0} points{me.rank ? ` · rank ${me.rank}` : ''}</p>
        {autoIn != null ? <p className="live-muted" role="status">Next question in {autoIn} s</p> : null}
      </div>
    );
  } else if (stage === 'finished') {
    body = (
      <div className="live-card">
        <h1>Finished</h1>
        <p className="live-final">{me.score ?? 0} points{me.rank ? ` · rank ${me.rank} of ${state.players}` : ''}</p>
        <p className="live-muted">{me.correct ?? 0} correct of {r.total}</p>
        <Board board={state.board} myRank={me.rank} />
        <Link className="btn primary block" to={`/live/results/${roomId}`}>See your results</Link>
      </div>
    );
  } else {
    body = <div className="live-card"><p>Waiting for the teacher…</p></div>;
  }

  return (
    <main className="live-play">
      {!connected ? <div className="live-reconnect" role="status">Reconnecting…</div> : null}
      <header className="live-play-head">
        <span className="live-play-nick">{me.nickname || 'You'}</span>
        <span className="live-play-score">{me.score ?? 0} points</span>
      </header>
      {body}
    </main>
  );
}
