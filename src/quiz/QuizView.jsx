import PageHead from '../components/PageHead.jsx';
import QuestionCard from './QuestionCard.jsx';
import SheetMap, { liveMarks } from './SheetMap.jsx';
import { quizStats } from './stats.js';

const TITLES = {
  practice: 'Practice',
  exam: 'Exam',
  'review-wrong': 'Wrong answers',
};

export default function QuizView({
  config, questions, qIds, answers, index, quizMode,
  setIndex, getDisplayOrder, onSelect, onReport,
  onExit, onSubmitExam, onFinish, dismissMeme,
}) {
  const stats = quizStats(answers, qIds, questions);
  const qIdx = qIds[index];
  const question = questions[qIdx];
  const isExam = quizMode === 'exam';
  const subjectTitle = config.title.replace(/ MCQ$/, '');
  const goTo = (i) => { dismissMeme(); setIndex(i); };

  return (
    <div className="container narrow">
      <PageHead backLabel={subjectTitle} onBack={onExit} title={TITLES[quizMode] || 'Questions'}>
        {isExam ? <button type="button" className="btn primary" onClick={onSubmitExam}>Submit exam</button> : null}
      </PageHead>

      <div className="sheet-head">
        <p className="sheet-count">Question {index + 1} of {qIds.length}</p>
        <p className="sheet-score">
          {isExam ? (
            `${stats.answered} answered`
          ) : (
            <><span className="good">{stats.correct} right</span>, <span className="bad">{stats.wrong} wrong</span></>
          )}
        </p>
      </div>
      <SheetMap marks={liveMarks(answers, qIds, questions, !isExam)} current={index} onJump={goTo} />

      {!question ? (
        <div className="state"><p>There are no questions to show.</p></div>
      ) : (
        <QuestionCard
          question={question}
          displayOrder={getDisplayOrder(qIdx)}
          index={index}
          total={qIds.length}
          answer={answers[index]}
          quizMode={quizMode}
          subjectTitle={subjectTitle}
          onSelect={(opt) => onSelect(index, opt)}
          onPrev={() => goTo(index - 1)}
          onNext={() => goTo(index + 1)}
          onFinish={isExam ? onSubmitExam : onFinish}
          onReport={() => onReport(qIdx)}
        />
      )}
    </div>
  );
}
