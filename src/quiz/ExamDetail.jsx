import { Breakdown, TopicBreakdown } from './Breakdown.jsx';
import { fmtDate, scoreClass } from '../lib/utils.js';

export default function ExamDetail({ record, onBack, onReview }) {
  if (!record) { onBack(); return null; }
  const sc = scoreClass(record.score);
  const colorVar = sc === 'good' ? 'good' : sc === 'warn' ? 'warn' : 'bad';

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-btn" aria-label="Back to dashboard" onClick={onBack}>←</button>
        <h1>{record.type === 'exam' ? 'Exam' : 'Practice'} Details</h1>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h3 style={{ margin: 0 }}>{fmtDate(record.date)}</h3>
            <p style={{ margin: '4px 0 0' }}>
              {record.questionCount} questions · {record.correct} correct · {record.wrong} wrong
            </p>
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: `var(--${colorVar})` }}>{record.score}%</div>
        </div>
      </div>
      <div className="bd-section">
        <h3>By Subject</h3>
        <Breakdown stats={record.subjectStats || {}} />
      </div>
      <div className="bd-section">
        <h3>By Topic</h3>
        <TopicBreakdown topicStats={record.topicStats || {}} />
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn primary" onClick={onReview}>Review All Questions</button>
      </div>
    </div>
  );
}
