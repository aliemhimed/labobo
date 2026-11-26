import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import { fetchResults } from '../../lib/live.js';
import { feedSpacedReview } from '../../lib/liveReview.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const day = (d) => (d ? new Date(d).toLocaleDateString() : '');
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(data) {
  const total = data.room.total;
  const head = ['Rank', 'Name', 'Email', 'Nickname', 'Score', 'Correct', 'Total questions', 'Left app'];
  const lines = [head, ...data.players.map((p) => [p.rank, p.name, p.email, p.nickname, p.score, p.correct, total, p.away])];
  const csv = lines.map((l) => l.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(data.room.title || 'live-results').replace(/[^\w-]+/g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function HostResults({ data }) {
  const { room, players, questions, average, teams } = data;
  return (
    <>
      <h1 className="live-title">{room.title}</h1>
      <p className="live-muted">{day(room.finished_at || room.created_at)} · {players.length} players · class average {Number(average ?? 0).toFixed(1)} points</p>
      <div className="live-actions">
        <button type="button" className="btn" onClick={() => downloadCsv(data)}>Download CSV</button>
      </div>

      {teams?.length ? (
        <>
          <h2>Teams</h2>
          <div className="live-table-wrap">
            <table className="live-table">
              <thead>
                <tr><th>Rank</th><th>Team</th><th>Members</th><th>Score</th><th>Correct</th></tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.no}>
                    <td>{t.rank}</td><td>{t.name}</td><td style={{ whiteSpace: 'normal' }}>{(t.members || []).join(', ')}</td>
                    <td>{t.score}</td><td>{t.correct} of {room.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <h2>Students</h2>
      <div className="live-table-wrap">
        <table className="live-table">
          <thead>
            <tr><th>Rank</th><th>Name</th><th>Email</th><th>Nickname</th><th>Score</th><th>Correct</th><th>Left app</th></tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.email || `${p.rank}-${p.name}`}>
                <td>{p.rank}</td><td>{p.name}</td><td>{p.email}</td><td>{p.nickname}</td>
                <td>{p.score}</td><td>{p.correct} of {room.total}</td><td>{p.away}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Questions</h2>
      <ol className="live-qlist">
        {questions.map((q) => {
          const counts = q.counts || {};
          const max = Math.max(1, ...q.options.map((_, i) => counts[i] || 0));
          return (
            <li key={q.position} className="live-qitem">
              <p className="live-qtext">{q.q}</p>
              <p className="live-muted">{pct(q.correct, q.answered)}% correct · {q.answered} answered</p>
              <ul className="live-dist">
                {q.options.map((o, i) => (
                  <li key={i} className={i === q.answer ? 'is-correct' : ''}>
                    <span className="live-dist-label"><b>{LETTERS[i]}</b> {o}</span>
                    <span className="live-dist-bar"><i style={{ width: `${((counts[i] || 0) / max) * 100}%` }} /></span>
                    <span className="live-dist-n">{counts[i] || 0}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function StudentResults({ data }) {
  const { room, me, board, review, answers, team } = data;
  // Live answers join the student's spaced review (once per room).
  useEffect(() => { feedSpacedReview(room.id, data); }, [room.id, data]);
  return (
    <>
      <h1 className="live-title">{room.title}</h1>
      <p className="live-muted">{day(room.created_at)}</p>
      <div className="live-card live-summary">
        <p className="live-final">{me.score} points</p>
        {team ? <p>{team.name} · rank {team.rank} of {team.teams}</p> : null}
        <p>{me.correct} correct of {room.total}{team ? '' : ` · rank ${me.rank} of ${me.players}`}</p>
      </div>

      {board?.length ? (
        <>
          <h2>Leaderboard</h2>
          <ol className="live-board">
            {board.map((r) => (
              <li key={`${r.rank}-${r.name}`} className={team ? (r.name === team.name ? 'is-me' : '') : (r.rank === me.rank ? 'is-me' : '')}>
                <span className="live-board-rank">{r.rank}</span>
                <span className="live-board-name">{r.name}</span>
                <span className="live-board-score">{r.score}</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <h2>Your answers</h2>
      <ol className="live-qlist">
        {answers.map((a) => (
          <li key={a.position} className="live-qitem">
            {review ? <p className="live-qtext">{a.q}</p> : <p className="live-qtext">Question {a.position + 1}</p>}
            <p className={a.correct ? 'live-ok' : 'live-bad'}>
              {a.choice == null ? 'No answer' : a.correct ? `Correct, +${a.points} points` : 'Wrong'}
            </p>
            {review && a.options ? (
              <>
                <p>
                  Your answer: {a.choice == null ? 'none' : `${LETTERS[a.choice]}. ${a.options[a.choice]}`}
                </p>
                <p>Correct answer: <b>{LETTERS[a.answer]}. {a.options[a.answer]}</b></p>
                {a.explanation ? <p className="live-expl">{a.explanation}</p> : null}
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </>
  );
}

export default function Results() {
  const { room } = useParams();
  const { data, error, isLoading } = useQuery({
    queryKey: ['live-results', room],
    queryFn: () => fetchResults(room),
    retry: false,
  });

  return (
    <>
      <TopBar subtitle="Live results" />
      <main id="main" tabIndex={-1} className="container live-results">
        {isLoading ? <p className="live-muted">Loading…</p> : null}
        {error ? (
          <div className="live-card">
            <p>{error.status === 404 ? 'Results appear here when the teacher finishes the quiz.' : error.message}</p>
          </div>
        ) : null}
        {data?.players ? <HostResults data={data} /> : null}
        {data && !data.players ? <StudentResults data={data} /> : null}
        <p><Link to="/live">Back to Live</Link></p>
      </main>
    </>
  );
}
