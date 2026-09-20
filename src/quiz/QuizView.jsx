import QuestionCard from './QuestionCard.jsx';
import { quizStats } from './stats.js';

const TITLES = {
  practice: 'Practice Mode',
  exam: 'Exam Mode',
  'review-wrong': 'Review Wrong Answers',
};

export default function QuizView({
  questions, qIds, answers, index, quizMode,
  setIndex, getDisplayOrder, onSelect, onReport,
  onExit, onSubmitExam, onFinish, dismissMeme,
}) {
  const stats = quizStats(answers, qIds, questions);
  const qIdx = qIds[index];
  const question = questions[qIdx];

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-btn" onClick={onExit}>←</button>
        <h1>{TITLES[quizMode] || 'Quiz'}</h1>
        <div className="ph-actions">
          {quizMode === 'exam' ? (
            <button className="btn danger" onClick={onSubmitExam}>Submit Exam</button>
          ) : null}
        </div>
      </div>
      <div id="quizArea">
        {!question ? (
          <div className="card empty-state">
            <div className="ico">📋</div>
            <h3>No questions to show</h3>
          </div>
        ) : (
          <QuestionCard
            question={question}
            displayOrder={getDisplayOrder(qIdx)}
            index={index}
            total={qIds.length}
            answer={answers[index]}
            quizMode={quizMode}
            stats={stats}
            onSelect={(opt) => onSelect(index, opt)}
            onPrev={() => { dismissMeme(); setIndex(index - 1); }}
            onNext={() => { dismissMeme(); setIndex(index + 1); }}
            onFinish={quizMode === 'exam' ? onSubmitExam : onFinish}
            onReport={() => onReport(qIdx)}
          />
        )}
      </div>
    </div>
  );
}
