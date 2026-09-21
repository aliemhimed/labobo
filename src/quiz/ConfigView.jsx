import { describeRatio, distribute } from '../lib/utils.js';

export default function ConfigView({ config, mode, examLength, setExamLength, onStart, onHome }) {
  const isExam = mode === 'exam';
  const dist = distribute(examLength, config.ratio);
  const ratioText = describeRatio(config.ratio);

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-btn" aria-label="Back to menu" onClick={onHome}>←</button>
        <h1>{isExam ? 'Configure Exam' : 'Configure Practice Set'}</h1>
      </div>
      <div className="card config-card">
        <h3>How many questions?</h3>
        {ratioText ? (
          <p>Subjects are distributed automatically: {ratioText}.</p>
        ) : (
          <p>All questions come from {Object.keys(config.ratio)[0]}.</p>
        )}
        <div className="length-grid" role="group" aria-label="Number of questions">
          {config.examLengths.map((n) => (
            <button type="button" key={n} className={'length-opt' + (n === examLength ? ' active' : '')}
                    aria-pressed={n === examLength} aria-label={`${n} questions`}
                    onClick={() => setExamLength(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="distribution">
          <strong>Distribution:</strong>{' '}
          {Object.entries(dist).map(([s, n], i) => (
            <span key={s}>{i > 0 ? ' · ' : ''}{s}: <strong>{n}</strong></span>
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>
            {isExam ? (
              <>
                <strong>Exam rules:</strong> No timer. Sequential navigation — you can revisit
                previous questions but cannot change your answer once selected. Answers and
                explanations appear only after you submit the exam.
              </>
            ) : (
              <>
                <strong>Practice rules:</strong> Mixed-subject set with immediate feedback after
                each answer. No timer. Your score is saved to history.
              </>
            )}
          </p>
          <button className="btn primary lg" style={{ width: '100%', marginTop: 10 }} onClick={onStart}>
            {isExam ? 'Start Exam' : 'Start Practice'} →
          </button>
        </div>
      </div>
    </div>
  );
}
