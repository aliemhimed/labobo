import { useEffect, useMemo, useRef, useState } from 'react';
import QuestionCard from './QuestionCard.jsx';
import { useTopicKeys } from '../hooks/useTopicKeys.js';
import { shuffle } from '../lib/utils.js';
import { quizStats } from './stats.js';
import { loadStudySession, saveStudySession } from '../lib/storage.js';

/* Study mode owns its own little session: the pool is derived from the
   filters, and a new pool (new filters, or an explicit Shuffle) starts
   fresh. Filters/pool/position are mirrored to sessionStorage so a refresh
   resumes instead of losing the place (see storage.js's studyKey). */
export default function StudyView({
  questions, subjectIndex, getDisplayOrder, triggerMeme, onReport, onHome, dismissMeme, prefix,
}) {
  const allTopicKeys = useTopicKeys(subjectIndex);

  const [restored] = useState(() => loadStudySession(prefix));
  const [restoredPool] = useState(() => {
    if (!restored?.ids?.length) return null;
    const idToIndex = new Map(questions.map((q, i) => [q.id, i]));
    const qIdxs = restored.ids.map((id) => idToIndex.get(id)).filter((i) => i !== undefined);
    return qIdxs.length ? { qIdxs, selected: restored.selected || [], index: restored.index || 0 } : null;
  });

  const [selectedTopics, setSelectedTopics] = useState(() => new Set(restored?.topics ?? allTopicKeys));
  const [search, setSearch] = useState(() => restored?.search ?? '');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [shuffleTick, setShuffleTick] = useState(0);

  /* The shuffled pool for the current filters — except the very first time,
     when a restored pool (if any) is reused as-is so a refresh lands back
     on the same questions in the same order instead of a fresh shuffle. */
  const usedRestoreRef = useRef(false);
  const qIds = useMemo(() => {
    if (!usedRestoreRef.current) {
      usedRestoreRef.current = true;
      if (restoredPool) return restoredPool.qIdxs;
    }
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

  /* Progress belongs to one pool; a new pool starts fresh (or resumes the
     restored one, on the very first render). */
  const [progress, setProgress] = useState(() => {
    if (!restoredPool) return { pool: null, answers: [], index: 0 };
    return {
      pool: restoredPool.qIdxs,
      answers: restoredPool.qIdxs.map((_, i) => restoredPool.selected[i] ?? null),
      index: Math.min(restoredPool.index, Math.max(0, restoredPool.qIdxs.length - 1)),
    };
  });
  const fresh = progress.pool === qIds ? progress : { pool: qIds, answers: qIds.map(() => null), index: 0 };
  const { index } = fresh;
  const answers = fresh.answers.map((selected, i) => ({ qIdx: qIds[i], selected }));
  const setIndex = (i) => setProgress({ ...fresh, index: i });

  useEffect(() => {
    const ids = qIds.map((i) => questions[i]?.id).filter(Boolean);
    if (!ids.length) { saveStudySession(prefix, null); return; }
    saveStudySession(prefix, { topics: Array.from(selectedTopics), search, ids, selected: fresh.answers, index: fresh.index });
  }, [prefix, questions, qIds, selectedTopics, search, fresh]);

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
        <button className="back-btn" aria-label="Back to menu"
                onClick={() => { saveStudySession(prefix, null); onHome(); }}>←</button>
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
