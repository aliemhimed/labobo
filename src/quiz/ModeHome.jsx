export default function ModeHome({ user, wrongCount, historyCount, onGo }) {
  const cards = [
    { key: 'study', cls: 'study', icon: '📚', title: 'Study Mode',
      desc: 'Browse by subject & topic. Instant feedback. No score saved.' },
    { key: 'practice-config', cls: 'practice', icon: '🎯', title: 'Practice Mode',
      desc: 'Mixed question set. See answers right away. Results saved.' },
    { key: 'exam-config', cls: 'exam', icon: '📝', title: 'Exam Mode',
      desc: 'Real-exam simulation. Answers hidden until the end. Score tracked.' },
    { key: 'review-wrong', cls: 'review', icon: '🔁', title: 'Review Wrong Answers',
      desc: 'Redo questions you got wrong. Practice mode style.',
      disabled: wrongCount === 0, badge: wrongCount || null },
    { key: 'dashboard', cls: 'dashboard', icon: '📊', title: 'Performance Dashboard',
      desc: `${historyCount} past session${historyCount !== 1 ? 's' : ''}. Track scores over time.` },
    { key: 'flashcards', cls: 'flashcards', icon: '🗂️', title: 'Flashcards',
      desc: 'Active recall with spaced repetition. Flip the card, rate yourself — weak cards come back more often.' },
    { key: 'leaderboard', cls: 'leaderboard', icon: '🏆', title: 'Weekly Leaderboard',
      desc: 'Compete on 30-Q exam scores. Resets every Monday.' },
  ];

  return (
    <div className="container">
      <div className="home-header">
        <h1>Hi, {user.name} 👋</h1>
        <p>Choose how you'd like to study today.</p>
      </div>
      <div className="mode-grid">
        {cards.map((c) => (
          <button key={c.key}
                  className={`mode-card ${c.cls}${c.disabled ? ' disabled' : ''}`}
                  onClick={() => { if (!c.disabled) onGo(c.key); }}>
            <div className="mode-icon">{c.icon}</div>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            {c.badge ? <div className="badge">{c.badge}</div> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
