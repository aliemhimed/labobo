import { useState } from 'react';
import { Breakdown, TopicBreakdown } from './Breakdown.jsx';

export default function ResultsView({ record, onHome, onReview }) {
  const [shown, setShown] = useState(false);
  if (!record) { onHome(); return null; }

  const score = record.score;
  const heroCls = score >= 75 ? 'pass' : score >= 50 ? '' : 'fail';

  return (
    <div className="container">
      <div className={'results-hero ' + heroCls}>
        <img src="/theme/mascot.webp" className="mascot-results" alt="Labobo" width="72" height="72" decoding="async" />
        <div className="score-label">{record.type === 'exam' ? 'Exam' : 'Practice'} score</div>
        <div className="big-score">{score}%</div>
        <div style={{ opacity: 0.85, fontSize: 13.5, marginTop: 4 }}>
          {record.correct} correct · {record.wrong} wrong · {record.questionCount} total
        </div>
      </div>

      <div className="results-stats">
        <div className="stat-tile"><div className="tile-val">{record.questionCount}</div><div className="tile-label">Questions</div></div>
        <div className="stat-tile"><div className="tile-val good">{record.correct}</div><div className="tile-label">Correct</div></div>
        <div className="stat-tile"><div className="tile-val bad">{record.wrong}</div><div className="tile-label">Wrong</div></div>
        <div className="stat-tile"><div className="tile-val">{score}%</div><div className="tile-label">Accuracy</div></div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <button className="btn primary" onClick={() => setShown((s) => !s)}>
          {shown ? 'Hide Detailed Breakdown' : 'View Detailed Breakdown'}
        </button>
        <button className="btn" onClick={onReview}>Review Answers</button>
        <button className="btn ghost" onClick={onHome}>Back to Home</button>
      </div>

      {shown ? (
        <div>
          <div className="bd-section">
            <h3>Performance by Subject</h3>
            <Breakdown stats={record.subjectStats || {}} />
          </div>
          <div className="bd-section">
            <h3>Performance by Topic</h3>
            <TopicBreakdown topicStats={record.topicStats || {}} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
