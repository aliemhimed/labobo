import { useEffect, useMemo, useState } from 'react';
import QuestionCard from './QuestionCard.jsx';
import { shuffle } from '../lib/utils.js';
import { quizStats } from './stats.js';

export default function StudyView({
  questions, subjectIndex, qIds, answers, index,
  setQIds, setAnswers, setIndex, getDisplayOrder, onSelect, onReport, onHome, dismissMeme,
}) {
  const allTopicKeys = useMemo(() => {
    const keys = [];
    Object.keys(subjectIndex).forEach((s) =>
      Object.keys(subjectIndex[s]).forEach((t) => keys.push(`${s}::${t}`))
    );
    return keys;
  }, [subjectIndex]);

  const [selectedTopics, setSelectedTopics] = useState(() => new Set(allTopicKeys));
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [shuffleTick, setShuffleTick] = useState(0);

  /* Rebuild the pool whenever the filters change. */
  useEffect(() => {
    const term = search.trim().toLowerCase();
    const pool = [];
    questions.forEach((q, i) => {
      if (!selectedTopics.has(`${q.subject}::${q.topic}`)) return;
      if (term) {
        const txt = (q.q + ' ' + q.options.join(' ')).toLowerCase();
        if (!txt.includes(term)) return;
      }
      pool.push(i);
    });
    const picked = shuffle(pool);
    setQIds(picked);
    setAnswers(picked.map((idx) => ({ qIdx: idx, selected: null })));
    setIndex(0);
  }, [questions, selectedTopics, search, shuffleTick, setQIds, setAnswers, setIndex]);

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
        <button className="back-btn" onClick={onHome}>←</button>
        <h1>Study Mode</h1>
      </div>
      <div className="filter-section">
        <div className="card">
          <div className="filter-search">
            <input type="text" placeholder="Search questions…" value={search}
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
                  <div className="subject-title"
                       onClick={() => setCollapsed((prev) => {
                         const next = new Set(prev);
                         if (next.has(subject)) next.delete(subject); else next.add(subject);
                         return next;
                       })}>
                    <span className="arrow">▶</span>{subject}<span className="count">{total}</span>
                  </div>
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
