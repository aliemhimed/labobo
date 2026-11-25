import { ChevronRight } from '../components/Icons.jsx';
import { LockedLectures } from '../components/Plan.jsx';
import { GuidesCard } from './Guides.jsx';

/* The three ways to answer questions are the big cards; the progress tools
   sit underneath as smaller white stickers. --tilt is each card's resting angle. */
const MODES = [
  { key: 'study', name: 'Study', icon: '📚', fill: 'violet', tilt: -1.2,
    desc: 'Browse by topic with each answer shown as you go. Nothing is scored.' },
  { key: 'practice-config', name: 'Practice', icon: '🎯', fill: 'mint', tilt: 1,
    desc: 'A mixed set with the answer after every question. Saved to your history.' },
  { key: 'exam-config', name: 'Exam', icon: '📝', fill: 'coral', tilt: -0.8,
    desc: 'A full set with answers held back until you submit, then scored.' },
];

export default function ModeHome({
  title, subjectKey, questionCount, topicCount, wrongCount, historyCount,
  dueCount = 0, dueTomorrowCount = 0, starredCount = 0, onGo,
}) {
  const tools = [
    { key: 'review-due', name: 'Due for review today', icon: '⏰', fill: 'coral',
      meta: dueCount ? `${dueCount} question${dueCount !== 1 ? 's' : ''} you missed, back on schedule`
        : dueTomorrowCount ? `All done. ${dueTomorrowCount} come back tomorrow` : 'Missed questions come back after 1, 3, 7 and 21 days',
      disabled: dueCount === 0, flagged: dueCount > 0 },
    { key: 'review-wrong', name: 'Review wrong answers', icon: '🔁', fill: 'blue',
      meta: wrongCount ? `${wrongCount} question${wrongCount !== 1 ? 's' : ''}` : 'None yet',
      disabled: wrongCount === 0, flagged: wrongCount > 0 },
    { key: 'starred', name: 'Starred questions', icon: '⭐', fill: 'mint',
      meta: starredCount ? `${starredCount} saved` : 'Tap the star on any question to save it',
      disabled: starredCount === 0 },
    { key: 'flashcards', name: 'Flashcards', icon: '🗂️', fill: 'orange', meta: 'Spaced repetition by topic' },
    { key: 'dashboard', name: 'Performance', icon: '📊', fill: 'yellow',
      meta: historyCount ? `${historyCount} session${historyCount !== 1 ? 's' : ''}` : 'No sessions yet' },
    { key: 'leaderboard', name: 'Weekly leaderboard', icon: '🏆', fill: 'violet', meta: 'Best 30-question exam' },
  ];

  return (
    <div className="container">
      <header className="subject-head">
        <h1>{title}</h1>
        <p className="lede">
          {questionCount.toLocaleString()} questions across {topicCount} topic{topicCount !== 1 ? 's' : ''}
        </p>
      </header>

      <GuidesCard subjectKey={subjectKey} onOpen={() => onGo('guides')} />

      <section aria-labelledby="modes-title">
        <h2 id="modes-title" className="section-title">Answer questions</h2>
        <div className="modes">
          {MODES.map((m, i) => (
            <button type="button" key={m.key} className={'mode fill-' + m.fill}
                    style={{ '--tilt': m.tilt + 'deg', '--i': i }} onClick={() => onGo(m.key)}>
              <span className="mode-icon" aria-hidden="true">{m.icon}</span>
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
              <button type="button" className={'tool fill-' + t.fill} disabled={t.disabled} onClick={() => onGo(t.key)}>
                <span className="tool-icon" aria-hidden="true">{t.icon}</span>
                <span className="tool-text">
                  <span className="tool-name">{t.name}</span>
                  <span className={'tool-meta' + (t.flagged ? ' flagged' : '')}>{t.meta}</span>
                </span>
                <ChevronRight />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <LockedLectures />
    </div>
  );
}
