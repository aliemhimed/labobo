import PageHead from '../components/PageHead.jsx';
import { Breakdown, TopicBreakdown } from './Breakdown.jsx';
import { fmtDate, scoreClass } from '../lib/utils.js';

export default function ExamDetail({ record, onBack, onReview }) {
  if (!record) { onBack(); return null; }
  const subjects = Object.keys(record.subjectStats || {});

  return (
    <div className="container narrow">
      <PageHead backLabel="Performance" onBack={onBack}
                title={record.type === 'exam' ? 'Exam' : 'Practice set'} />
      <p className="lede">
        Taken {fmtDate(record.date)}. You got {record.correct} of {record.questionCount} right
        (<span className={'score-' + scoreClass(record.score)}>{record.score}%</span>).
      </p>
      <div className="results-actions">
        <button type="button" className="btn primary" onClick={onReview}>Review answers</button>
      </div>

      {subjects.length > 1 ? (
        <section className="bd-section" aria-labelledby="detail-subject-title">
          <h2 id="detail-subject-title" className="section-title">By subject</h2>
          <Breakdown stats={record.subjectStats} />
        </section>
      ) : null}
      <section className="bd-section" aria-labelledby="detail-topic-title">
        <h2 id="detail-topic-title" className="section-title">By topic, weakest first</h2>
        <TopicBreakdown topicStats={record.topicStats || {}} showSubjects={subjects.length > 1} />
      </section>
    </div>
  );
}
