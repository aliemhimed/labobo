import { useRef } from 'react';
import QuestionBody from './QuestionBody.jsx';
import { useEqualOptionHeights } from '../hooks/useEqualOptionHeights.js';
import { useQuizShortcuts } from '../hooks/useQuizShortcuts.js';
import { LETTERS } from '../lib/utils.js';

/* Post-exam review: every answer visible, original option order (no
   reshuffle) so the letters match what the student actually saw. */
export default function ReviewView({
  questions, qIds, answers, index, setIndex, onReport, onBack,
}) {
  const optionsRef = useRef(null);
  const qIdx = qIds[index];
  const question = questions[qIdx];
  const answer = answers[index];

  useEqualOptionHeights(optionsRef, [question]);
  useQuizShortcuts({
    optionCount: 0,
    onPrev: () => { if (index > 0) setIndex(index - 1); },
    onNext: () => { if (index < qIds.length - 1) setIndex(index + 1); },
  });

  if (!question) {
    return (
      <div className="container">
        <div className="page-header">
          <button className="back-btn" aria-label="Back" onClick={onBack}>←</button>
          <h1>Review Answers</h1>
        </div>
        <div className="card empty-state">
          <div className="ico">📋</div>
          <h3>Nothing to review</h3>
          <p>These questions are no longer in the question bank.</p>
        </div>
      </div>
    );
  }

  const wasAnswered = answer && answer.selected !== null;
  const isCorrect = wasAnswered && answer.selected === question.answer;

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-btn" aria-label="Back" onClick={onBack}>←</button>
        <h1>Review Answers</h1>
      </div>
      <div id="quizArea">
        <div className="quiz-progress-bar">
          <div className="qpb-stat">
            <span className="qpb-label">Question</span>
            <span className="qpb-value">{index + 1} / {qIds.length}</span>
          </div>
          <div className="qpb-fill"><div style={{ width: `${(100 * (index + 1)) / qIds.length}%` }} /></div>
        </div>
        <div className="question-card">
          <QuestionBody question={question} index={index} onReport={() => onReport(qIdx)} />
          <div className="options" ref={optionsRef}>
            {question.options.map((opt, i) => {
              let cls = 'option disabled';
              let glyph = null;
              let status = null;
              if (i === question.answer) { cls += ' correct'; glyph = '✓'; status = 'Correct answer'; }
              else if (wasAnswered && i === answer.selected) { cls += ' incorrect'; glyph = '✗'; status = 'Your answer, incorrect'; }
              return (
                <div key={i} className={cls}>
                  <span className="letter">{LETTERS[i]}</span>
                  <span className="body">{opt}</span>
                  {glyph ? <span className="mark" aria-hidden="true">{glyph}</span> : null}
                  {status ? <span className="sr-only">{status}</span> : null}
                </div>
              );
            })}
          </div>
          <div className={'explanation ' + (isCorrect ? 'good' : 'bad')}>
            <strong>
              {isCorrect
                ? '✓ Correct'
                : wasAnswered
                  ? `✗ Incorrect — Correct answer: ${LETTERS[question.answer]}`
                  : `Unanswered — Correct answer: ${LETTERS[question.answer]}`}.
            </strong>
            {question.explanation ? ' ' + question.explanation : ''}
          </div>
          <div className="actions">
            <button className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>← Previous</button>
            <button className="btn primary" disabled={index === qIds.length - 1}
                    onClick={() => setIndex(index + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
