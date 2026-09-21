import { useRef } from 'react';
import QuestionBody from './QuestionBody.jsx';
import { useEqualOptionHeights } from '../hooks/useEqualOptionHeights.js';
import { useQuizShortcuts } from '../hooks/useQuizShortcuts.js';
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

  /* Once an answer is chosen the question is locked in every mode. */
  const locked = answered;

  useQuizShortcuts({
    optionCount: displayOrder.length,
    onChoose: (pos) => { if (!locked) onSelect(displayOrder[pos]); },
    onPrev: () => { if (index > 0) onPrev(); },
    onNext: () => { if (!isLast) onNext(); },
  });

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
            let glyph = null;
            let status = null; // spoken by screen readers; the glyph is the visual twin
            if (locked) cls += ' disabled';
            if (isExam) {
              if (answered && origIdx === answer.selected) { cls += ' selected'; status = 'Your answer'; }
            } else if (showFeedback) {
              if (origIdx === question.answer) { cls += ' correct'; glyph = '✓'; status = 'Correct answer'; }
              else if (origIdx === answer.selected) { cls += ' incorrect'; glyph = '✗'; status = 'Your answer, incorrect'; }
            }
            return (
              <button type="button" key={origIdx} className={cls} data-i={origIdx}
                      aria-disabled={locked || undefined}
                      onClick={() => { if (!locked) onSelect(origIdx); }}>
                <span className="letter">{LETTERS[displayPos]}</span>
                <span className="body">{question.options[origIdx]}</span>
                {glyph ? <span className="mark" aria-hidden="true">{glyph}</span> : null}
                {status ? <span className="sr-only">{status}</span> : null}
              </button>
            );
          })}
        </div>

        {/* Announced as soon as an answer is chosen. */}
        <div role="status" aria-live="polite">
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
        </div>

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
        <div className="shortcut-hint" aria-hidden="true">
          Keys: <kbd>1</kbd>–<kbd>{displayOrder.length}</kbd> or <kbd>A</kbd>–<kbd>{LETTERS[displayOrder.length - 1]}</kbd> to answer
          · <kbd>←</kbd> <kbd>→</kbd> to move
        </div>
      </div>
    </>
  );
}
