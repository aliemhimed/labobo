import { useMemo } from 'react';
import { useHistory, useWrong } from '../hooks/useStore.js';
import { Breakdown } from './Breakdown.jsx';
import { fmtDate, scoreClass } from '../lib/utils.js';

export default function Dashboard({ store, onHome, onOpen }) {
  const hist = useHistory(store);
  const wrongMap = useWrong(store);
  const { wrong, avg, totalAnswered, bySubj, worst } = useMemo(() => {
    const wrong = Object.keys(wrongMap).length;
    let totalAnswered = 0, totalCorrect = 0;
    const bySubj = {};
    hist.forEach((r) => {
      totalAnswered += r.questionCount;
      totalCorrect += r.correct;
      Object.entries(r.subjectStats || {}).forEach(([s, st]) => {
        if (!bySubj[s]) bySubj[s] = { correct: 0, total: 0 };
        bySubj[s].correct += st.correct;
        bySubj[s].total += st.total;
      });
    });
    const avg = totalAnswered > 0 ? Math.round((100 * totalCorrect) / totalAnswered) : 0;

    let worst = '—', worstPct = 101;
    Object.entries(bySubj).forEach(([s, st]) => {
      const p = st.total ? Math.round((100 * st.correct) / st.total) : 0;
      if (p < worstPct && st.total >= 5) { worstPct = p; worst = s; }
    });
    return { wrong, avg, totalAnswered, bySubj, worst };
  }, [hist, wrongMap]);

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-btn" aria-label="Back to menu" onClick={onHome}>←</button>
        <h1>Performance Dashboard</h1>
      </div>
      <div className="dash-grid">
        <div className="stat-tile"><div className="tile-val">{hist.length}</div><div className="tile-label">Sessions</div></div>
        <div className="stat-tile">
          <div className={'tile-val ' + scoreClass(avg)}>{hist.length ? avg + '%' : '—'}</div>
          <div className="tile-label">Average score</div>
        </div>
        <div className="stat-tile"><div className="tile-val">{totalAnswered}</div><div className="tile-label">Total questions</div></div>
        <div className="stat-tile"><div className="tile-val bad">{wrong}</div><div className="tile-label">In wrong-answer pool</div></div>
        <div className="stat-tile">
          <div className="tile-val" style={{ fontSize: 15 }}>{worst}</div>
          <div className="tile-label">Weakest subject</div>
        </div>
      </div>

      {Object.keys(bySubj).length > 0 ? (
        <div className="bd-section" style={{ marginBottom: 18 }}>
          <h3>Lifetime accuracy by subject</h3>
          <Breakdown stats={bySubj} />
        </div>
      ) : null}

      {hist.length === 0 ? (
        <div className="card empty-state">
          <div className="ico">📋</div>
          <h3>No sessions yet</h3>
          <p>Take a Practice or Exam to see your history here.</p>
        </div>
      ) : (
        <div className="history-table">
          <div className="history-row header">
            <div>Date</div><div>Type</div><div>Qs</div><div>Subjects</div><div>Score</div>
          </div>
          {hist.map((r) => (
            <button type="button" key={r.id} className="history-row" onClick={() => onOpen(r)}
                    aria-label={`Open ${r.type === 'exam' ? 'exam' : 'practice'} from ${fmtDate(r.date)}, score ${r.score}%`}>
              <div>{fmtDate(r.date)}</div>
              <div>
                <span className={'ht-type' + (r.type === 'exam' ? ' exam' : '')}>
                  {r.type === 'exam' ? 'Exam' : 'Practice'}
                </span>
              </div>
              <div>{r.questionCount}</div>
              <div>
                {Object.entries(r.subjectStats || {}).map(([s, st]) => (
                  <small key={s} style={{ color: 'var(--text-muted)', marginRight: 6 }}>
                    {s.slice(0, 3)}: {st.correct}/{st.total}
                  </small>
                ))}
              </div>
              <div className={'ht-score ' + scoreClass(r.score)}>{r.score}%</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
