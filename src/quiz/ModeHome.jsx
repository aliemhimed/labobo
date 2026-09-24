import { ChevronRight } from '../components/Icons.jsx';

const MODES = [
  { key: 'study', name: 'Study',
    desc: 'Browse by topic with each answer shown as you go. Nothing is scored.' },
  { key: 'practice-config', name: 'Practice',
    desc: 'A mixed set with the answer after every question. Saved to your history.' },
  { key: 'exam-config', name: 'Exam',
    desc: 'A full set with answers held back until you submit, then scored.' },
];

export default function ModeHome({ title, questionCount, topicCount, wrongCount, historyCount, onGo }) {
  const tools = [
    { key: 'review-wrong', name: 'Review wrong answers',
      meta: wrongCount ? `${wrongCount} question${wrongCount !== 1 ? 's' : ''}` : 'None yet',
      disabled: wrongCount === 0, flagged: wrongCount > 0 },
    { key: 'flashcards', name: 'Flashcards', meta: 'Spaced repetition by topic' },
    { key: 'dashboard', name: 'Performance',
      meta: historyCount ? `${historyCount} session${historyCount !== 1 ? 's' : ''}` : 'No sessions yet' },
    { key: 'leaderboard', name: 'Weekly leaderboard', meta: 'Best 30-question exam' },
  ];

  return (
    <div className="container">
      <header className="subject-head">
        <h1>{title}</h1>
        <p className="lede">
          {questionCount.toLocaleString()} questions across {topicCount} topic{topicCount !== 1 ? 's' : ''}
        </p>
      </header>

      <section aria-labelledby="modes-title">
        <h2 id="modes-title" className="section-title">Answer questions</h2>
        <div className="modes">
          {MODES.map((m) => (
            <button type="button" key={m.key} className="mode" onClick={() => onGo(m.key)}>
              <span className="mode-name">{m.name}</span>
              <span className="mode-desc">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="tools-section" aria-labelledby="tools-title">
        <h2 id="tools-title" className="section-title">Your progress</h2>
        <ul className="tools">
          {tools.map((t) => (
            <li key={t.key}>
              <button type="button" className="tool" disabled={t.disabled} onClick={() => onGo(t.key)}>
                <span className="tool-name">{t.name}</span>
                <span className={'tool-meta' + (t.flagged ? ' flagged' : '')}>{t.meta}</span>
                <ChevronRight />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
