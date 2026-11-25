import { useState } from 'react';
import SheetMap from './SheetMap.jsx';
import { Breakdown, TopicBreakdown } from './Breakdown.jsx';

/* The marked sheet: what you scored in words, every question as a right or
   wrong bubble (tap one to review it), then where the marks were lost. */
function ShareButton({ record, subjectTitle, kind }) {
  const [state, setState] = useState('idle');
  async function share() {
    setState('busy');
    try {
      // The drawing code loads only when someone shares.
      const { shareScore } = await import('../lib/shareCard.js');
      const how = await shareScore({ subject: subjectTitle, kind, correct: record.correct, total: record.questionCount, score: record.score });
      setState(how === 'downloaded' ? 'saved' : 'idle');
    } catch {
      setState('failed');
    }
  }
  return (
    <button type="button" className="btn" onClick={share} disabled={state === 'busy'}>
      {state === 'busy' ? 'Making the picture…' : state === 'saved' ? 'Picture saved' : state === 'failed' ? 'Couldn’t make it, try again' : 'Share my score'}
    </button>
  );
}

export default function ResultsView({ record, marks, subjectTitle, onHome, onReview }) {
  if (!record) { onHome(); return null; }

  const kind = record.type === 'exam' ? 'exam' : 'practice set';
  const subjects = Object.keys(record.subjectStats || {});
  const missed = record.questionCount - record.correct;

  return (
    <div className="container narrow results">
      <h1>You got {record.correct} of {record.questionCount} right.</h1>
      <p className="lede results-sub">
        That’s {record.score}% on this {kind}.{' '}
        {missed === 0
          ? 'Nothing to review.'
          : `The ${missed === 1 ? 'question' : `${missed} questions`} you missed ${missed === 1 ? 'is' : 'are'} now in your wrong-answer list.`}
      </p>

      <SheetMap marks={marks} wrap onJump={(i) => onReview(i)} label="Your answers, tap one to review it" />

      <div className="results-actions">
        <button type="button" className="btn primary" onClick={() => onReview(0)}>Review answers</button>
        <ShareButton record={record} subjectTitle={subjectTitle} kind={kind} />
        <button type="button" className="btn" onClick={onHome}>Back to {subjectTitle}</button>
      </div>

      {subjects.length > 1 ? (
        <section className="bd-section" aria-labelledby="bd-subject-title">
          <h2 id="bd-subject-title" className="section-title">By subject</h2>
          <Breakdown stats={record.subjectStats} />
        </section>
      ) : null}
      <section className="bd-section" aria-labelledby="bd-topic-title">
        <h2 id="bd-topic-title" className="section-title">By topic, weakest first</h2>
        <TopicBreakdown topicStats={record.topicStats || {}} showSubjects={subjects.length > 1} />
      </section>
    </div>
  );
}
