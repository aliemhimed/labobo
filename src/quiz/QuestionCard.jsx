import { useRef } from 'react';
import QuestionBody from './QuestionBody.jsx';
import { useEqualOptionHeights } from '../hooks/useEqualOptionHeights.js';
import { useQuizShortcuts } from '../hooks/useQuizShortcuts.js';
import { LETTERS } from '../lib/utils.js';
import { Check, Cross } from '../components/Icons.jsx';

/* One question on the answer sheet. Options are rendered in a shuffled order
   so the correct answer isn't always in the same slot; `displayOrder` maps
   display position -> the option's original index, which is what `answer`
   refers to. Choosing an option fills its bubble; in practice and study the
   bubbles then show right and wrong. */
export default function QuestionCard({
  question,
  displayOrder,
  index,
  total,
  answer,
  quizMode,
  subjectTitle,
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
  const gotItRight = answered && answer.selected === question.answer;

  /* Once an answer is chosen the question is locked in every mode. */
  const locked = answered;

  useQuizShortcuts({
    optionCount: displayOrder.length,
    onChoose: (pos) => { if (!locked) onSelect(displayOrder[pos]); },
    onPrev: () => { if (index > 0) onPrev(); },
    onNext: () => { if (!isLast) onNext(); },
  });

  return (
    <article className="question">
      <QuestionBody question={question} subjectTitle={subjectTitle} onReport={onReport} />

      <div className="options" ref={optionsRef}>
        {displayOrder.map((origIdx, displayPos) => {
          let cls = 'option';
          let mark = null;
          let status = null; // spoken by screen readers; the mark is the visual twin
          if (locked) cls += ' disabled';
          if (isExam) {
            if (answered && origIdx === answer.selected) { cls += ' selected'; status = 'Your answer'; }
          } else if (showFeedback) {
            if (origIdx === question.answer) { cls += ' correct'; mark = <Check />; status = 'Correct answer'; }
            else if (origIdx === answer.selected) { cls += ' incorrect'; mark = <Cross />; status = 'Your answer, incorrect'; }
          }
          return (
            <button type="button" key={origIdx} className={cls} data-i={origIdx}
                    aria-disabled={locked || undefined}
                    onClick={() => { if (!locked) onSelect(origIdx); }}>
              <span className="bubble" aria-hidden="true">{LETTERS[displayPos]}</span>
              <span className="option-text">{question.options[origIdx]}</span>
              {mark ? <span className="mark" aria-hidden="true">{mark}</span> : null}
              <span className="sr-only">Option {LETTERS[displayPos]}{status ? `, ${status}` : ''}</span>
            </button>
          );
        })}
      </div>

      {/* Announced as soon as an answer is chosen. */}
      <div role="status" aria-live="polite">
        {showFeedback ? (
          <div className={'explanation ' + (gotItRight ? 'good' : 'bad')}>
            <p className="verdict">
              {gotItRight ? 'Correct.' : `Incorrect. The answer is ${LETTERS[correctDisplayPos]}.`}
            </p>
            {question.explanation ? <p className="explanation-text">{question.explanation}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="q-nav">
        <button type="button" className="btn" disabled={index === 0} onClick={onPrev}>Previous</button>
        {isLast && isExam ? (
          <button type="button" className="btn primary" onClick={onFinish}>Submit exam</button>
        ) : isLast && (quizMode === 'practice' || quizMode === 'review-wrong') ? (
          <button type="button" className="btn primary" onClick={onFinish}>See results</button>
        ) : (
          <button type="button" className="btn primary" disabled={isLast} onClick={onNext}>Next question</button>
        )}
      </div>
      <p className="shortcut-hint" aria-hidden="true">
        Press <kbd>1</kbd>–<kbd>{displayOrder.length}</kbd> or <kbd>A</kbd>–<kbd>{LETTERS[displayOrder.length - 1]}</kbd> to
        answer, <kbd>←</kbd> <kbd>→</kbd> to move between questions.
      </p>
    </article>
  );
}
