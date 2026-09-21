import { useRef } from 'react';
import QuestionBody from './QuestionBody.jsx';
import { useEqualOptionHeights } from '../hooks/useEqualOptionHeights.js';
import { LETTERS } from '../lib/utils.js';

/* Options are rendered in a shuffled order so the correct answer isn't
   always in the same slot; `displayOrder` maps display position -> the
   option's original index, which is what `answer` refers to. */
export default function QuestionCard({
  question,
  displayOrder,
  index,
  total,
  answer,
  quizMode,
  stats,
  onSelect,
  onPrev,
  onNext,
  onFinish,
  onReport,
}) {
  const optionsRef = useRef(null);
  const isExam = quizMode === 'exam';
  const answered = answer && answer.selected !== null;
  const showFeedback = !isExam && answered;

  useEqualOptionHeights(optionsRef, [question, displayOrder, answer]);

  const isLast = index === total - 1;
  const correctDisplayPos = displayOrder.indexOf(question.answer);

  return (
    <>
      <div className="quiz-progress-bar">
        <div className="qpb-stat">
          <span className="qpb-label">Question</span>
          <span className="qpb-value">{index + 1} / {total}</span>
        </div>
        {!isExam ? (
          <>
            <div className="qpb-stat">
              <span className="qpb-label">Correct</span>
              <span className="qpb-value good">{stats.correct}</span>
            </div>
            <div className="qpb-stat">
              <span className="qpb-label">Wrong</span>
              <span className="qpb-value bad">{stats.wrong}</span>
            </div>
            <div className="qpb-stat">
              <span className="qpb-label">Accuracy</span>
              <span className="qpb-value">{stats.accuracy !== null ? stats.accuracy + '%' : '—'}</span>
            </div>
          </>
        ) : (
          <div className="qpb-stat">
            <span className="qpb-label">Answered</span>
            <span className="qpb-value">{stats.answered} / {total}</span>
          </div>
        )}
        <div className="qpb-fill"><div style={{ width: `${(100 * (index + 1)) / total}%` }} /></div>
      </div>

      <div className="question-card">
        <QuestionBody question={question} index={index} onReport={onReport} />

        <div className="options" ref={optionsRef}>
          {displayOrder.map((origIdx, displayPos) => {
            let cls = 'option';
            if (isExam) {
              if (answered) {
                cls += ' disabled';
                if (origIdx === answer.selected) cls += ' selected';
              }
            } else if (showFeedback) {
              cls += ' disabled';
              if (origIdx === question.answer) cls += ' correct';
              else if (origIdx === answer.selected) cls += ' incorrect';
            }
            const disabled = cls.includes('disabled');
            return (
              <div key={origIdx} className={cls} data-i={origIdx}
                   onClick={() => { if (!disabled) onSelect(origIdx); }}>
                <div className="letter">{LETTERS[displayPos]}</div>
                <div>{question.options[origIdx]}</div>
              </div>
            );
          })}
        </div>

        {showFeedback ? (
          <div className={'explanation ' + (answer.selected === question.answer ? 'good' : 'bad')}>
            <strong>
              {answer.selected === question.answer
                ? '✓ Correct'
                : `✗ Incorrect — Correct answer: ${LETTERS[correctDisplayPos]}`}.
            </strong>
            {question.explanation ? ' ' + question.explanation : ''}
          </div>
        ) : null}

        <div className="actions">
          <button className="btn" disabled={index === 0} onClick={onPrev}>← Previous</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {isLast && isExam ? (
              <button className="btn primary" onClick={onFinish}>Submit Exam</button>
            ) : isLast && (quizMode === 'practice' || quizMode === 'review-wrong') ? (
              <button className="btn primary" onClick={onFinish}>Finish &amp; See Results</button>
            ) : (
              <button className="btn primary" disabled={isLast} onClick={onNext}>Next →</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
