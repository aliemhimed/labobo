import { useRef } from 'react';
import PageHead from '../components/PageHead.jsx';
import QuestionBody from './QuestionBody.jsx';
import SheetMap from './SheetMap.jsx';
import { useEqualOptionHeights } from '../hooks/useEqualOptionHeights.js';
import { useQuizShortcuts } from '../hooks/useQuizShortcuts.js';
import { LETTERS } from '../lib/utils.js';
import { Check, Cross } from '../components/Icons.jsx';

/* Post-exam review: every answer visible, original option order (no
   reshuffle) so the letters match the question as stored. The answer sheet
   shows every question right or wrong; tap one to jump to it. */
export default function ReviewView({
  config, questions, qIds, answers, index, setIndex, onReport, onBack, backLabel,
}) {
  const optionsRef = useRef(null);
  const qIdx = qIds[index];
  const question = questions[qIdx];
  const answer = answers[index];
  const subjectTitle = config.title.replace(/ MCQ$/, '');

  useEqualOptionHeights(optionsRef, [question]);
  useQuizShortcuts({
    optionCount: 0,
    onPrev: () => { if (index > 0) setIndex(index - 1); },
    onNext: () => { if (index < qIds.length - 1) setIndex(index + 1); },
  });

  const marks = qIds.map((qi, i) => {
    const q = questions[qi];
    if (!q) return null;
    return answers[i]?.selected === q.answer ? 'correct' : 'wrong';
  });
  const right = marks.filter((m) => m === 'correct').length;

  if (!question) {
    return (
      <div className="container narrow">
        <PageHead backLabel={backLabel} onBack={onBack} title="Review answers" />
        <div className="state"><p>These questions are no longer in the question bank.</p></div>
      </div>
    );
  }

  const wasAnswered = answer && answer.selected !== null;
  const isCorrect = wasAnswered && answer.selected === question.answer;

  return (
    <div className="container narrow">
      <PageHead backLabel={backLabel} onBack={onBack} title="Review answers" />

      <div className="sheet-head">
        <p className="sheet-count">Question {index + 1} of {qIds.length}</p>
        <p className="sheet-score">
          <span className="good">{right} right</span>, <span className="bad">{marks.length - right} wrong</span>
        </p>
      </div>
      <SheetMap marks={marks} current={index} onJump={setIndex} />

      <article className="question">
        <QuestionBody question={question} subjectTitle={subjectTitle} onReport={() => onReport(qIdx)} />
        <div className="options" ref={optionsRef}>
          {question.options.map((opt, i) => {
            let cls = 'option disabled';
            let mark = null;
            let status = null;
            if (i === question.answer) { cls += ' correct'; mark = <Check />; status = 'Correct answer'; }
            else if (wasAnswered && i === answer.selected) { cls += ' incorrect'; mark = <Cross />; status = 'Your answer, incorrect'; }
            return (
              <div key={i} className={cls}>
                <span className="bubble" aria-hidden="true">{LETTERS[i]}</span>
                <span className="option-text">{opt}</span>
                {mark ? <span className="mark" aria-hidden="true">{mark}</span> : null}
                <span className="sr-only">Option {LETTERS[i]}{status ? `, ${status}` : ''}</span>
              </div>
            );
          })}
        </div>
        <div className={'explanation ' + (isCorrect ? 'good' : 'bad')}>
          <p className="verdict">
            {isCorrect
              ? 'Correct.'
              : wasAnswered
                ? `Incorrect. The answer is ${LETTERS[question.answer]}.`
                : `Not answered. The answer is ${LETTERS[question.answer]}.`}
          </p>
          {question.explanation ? <p className="explanation-text">{question.explanation}</p> : null}
        </div>
        <div className="q-nav">
          <button type="button" className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>
          <button type="button" className="btn primary" disabled={index === qIds.length - 1}
                  onClick={() => setIndex(index + 1)}>Next question</button>
        </div>
      </article>
    </div>
  );
}
