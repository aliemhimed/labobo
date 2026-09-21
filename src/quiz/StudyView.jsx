import { useMemo, useState } from 'react';
import QuestionCard from './QuestionCard.jsx';
import { useTopicKeys } from '../hooks/useTopicKeys.js';
import { shuffle } from '../lib/utils.js';
import { quizStats } from './stats.js';

/* Study mode owns its own little session: the pool is derived from the
   filters, and answers/position reset whenever the pool is rebuilt. */
export default function StudyView({
  questions, subjectIndex, getDisplayOrder, triggerMeme, onReport, onHome, dismissMeme,
}) {
  const allTopicKeys = useTopicKeys(subjectIndex);

  const [selectedTopics, setSelectedTopics] = useState(() => new Set(allTopicKeys));
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [shuffleTick, setShuffleTick] = useState(0);

  /* The shuffled pool for the current filters. */
  const qIds = useMemo(() => {
    const term = search.trim().toLowerCase();
    const pool = [];
    questions.forEach((q, i) => {
      if (!selectedTopics.has(`${q.subject}::${q.topic}`)) return;
      if (term && !(q.q + ' ' + q.options.join(' ')).toLowerCase().includes(term)) return;
      pool.push(i);
    });
    return shuffle(pool);
    // shuffleTick re-runs the shuffle on demand
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, selectedTopics, search, shuffleTick]);

  /* Progress belongs to one pool; a new pool starts fresh. */
  const [progress, setProgress] = useState({ pool: null, answers: [], index: 0 });
  const fresh = progress.pool === qIds ? progress : { pool: qIds, answers: qIds.map(() => null), index: 0 };
  const { index } = fresh;
  const answers = fresh.answers.map((selected, i) => ({ qIdx: qIds[i], selected }));
  const setIndex = (i) => setProgress({ ...fresh, index: i });

  function onSelect(slot, option) {
    const next = fresh.answers.slice();
    next[slot] = option;
    setProgress({ ...fresh, answers: next });
    const q = questions[qIds[slot]];
    if (q) triggerMeme(option === q.answer);
  }

  function toggleTopic(key, on) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (on) next.add(key); else next.delete(key);
      return next;
    });
  }

  const stats = quizStats(answers, qIds, questions);
  const qIdx = qIds[index];
  const question = questions[qIdx];

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-btn" aria-label="Back to menu" onClick={onHome}>←</button>
        <h1>Study Mode</h1>
      </div>
      <div className="filter-section">
        <div className="card">
          <div className="filter-search">
            <input type="search" aria-label="Search questions" placeholder="Search questions…" value={search}
                   onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-actions">
            <button className="btn" onClick={() => setSelectedTopics(new Set(allTopicKeys))}>All</button>
            <button className="btn" onClick={() => setSelectedTopics(new Set())}>Clear</button>
            <button className="btn" onClick={() => setShuffleTick((t) => t + 1)}>Shuffle</button>
          </div>
          <div id="filters">
            {Object.keys(subjectIndex).map((subject) => {
              const topics = subjectIndex[subject];
              const total = Object.values(topics).reduce((n, arr) => n + arr.length, 0);
              const isOpen = !collapsed.has(subject);
              return (
                <div key={subject} className={'subject-group' + (isOpen ? ' open' : '')}>
                  <button type="button" className="subject-title" aria-expanded={isOpen}
                          onClick={() => setCollapsed((prev) => {
                            const next = new Set(prev);
                            if (next.has(subject)) next.delete(subject); else next.add(subject);
                            return next;
                          })}>
                    <span className="arrow" aria-hidden="true">▶</span>{subject}<span className="count">{total}</span>
                  </button>
                  <div className="topics">
                    {Object.keys(topics).map((topic) => {
                      const key = `${subject}::${topic}`;
                      return (
                        <label key={key} className="topic-row">
                          <input type="checkbox" checked={selectedTopics.has(key)}
                                 onChange={(e) => toggleTopic(key, e.target.checked)} />
                          <span style={{ flex: 1 }}>{topic}</span>
                          <span className="tc">{topics[topic].length}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="main">
          <div id="quizArea">
            {qIds.length === 0 ? (
              <div className="card empty-state">
                <div className="ico">🔍</div>
                <h3>No questions match</h3>
                <p>Adjust your filters or clear the search to see questions.</p>
              </div>
            ) : question ? (
              <QuestionCard
                question={question}
                displayOrder={getDisplayOrder(qIdx)}
                index={index}
                total={qIds.length}
                answer={answers[index]}
                quizMode="study"
                stats={stats}
                onSelect={(opt) => onSelect(index, opt)}
                onPrev={() => { dismissMeme(); setIndex(index - 1); }}
                onNext={() => { dismissMeme(); setIndex(index + 1); }}
                onFinish={() => {}}
                onReport={() => onReport(qIdx)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
