import { useEffect, useMemo, useRef, useState } from 'react';
import QuestionCard from './QuestionCard.jsx';
import SheetMap, { liveMarks } from './SheetMap.jsx';
import PageHead from '../components/PageHead.jsx';
import { useTopicKeys } from '../hooks/useTopicKeys.js';
import { shuffle } from '../lib/utils.js';
import { quizStats } from './stats.js';
import { loadStudySession, saveStudySession } from '../lib/storage.js';

/* Study mode owns its own little session: the pool is derived from the
   filters, and a new pool (new filters, or an explicit Shuffle) starts
   fresh. Filters/pool/position are mirrored to sessionStorage so a refresh
   resumes instead of losing the place (see storage.js's studyKey). */
export default function StudyView({
  questions, subjectIndex, subjectTitle, getDisplayOrder, triggerMeme, onReport, onHome, dismissMeme, prefix,
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
  // Filters sit beside the question on wide screens; on phones they start
  // folded away so the question comes first.
  const [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);

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
  const goTo = (i) => { dismissMeme(); setIndex(i); };

  return (
    <div className="container">
      <PageHead backLabel={subjectTitle} onBack={() => { saveStudySession(prefix, null); onHome(); }}
                title="Study" />
      <div className="study">
        <button type="button" className="btn filters-toggle" aria-expanded={filtersOpen}
                aria-controls="study-filters" onClick={() => setFiltersOpen((o) => !o)}>
          {filtersOpen ? 'Hide topics and search' : `Topics and search (${qIds.length} questions)`}
        </button>
        <aside id="study-filters" className={'study-filters' + (filtersOpen ? ' open' : '')}
               aria-label="Choose which questions to study">
          <input type="search" aria-label="Search questions" placeholder="Search questions" value={search}
                 onChange={(e) => setSearch(e.target.value)} />
          <div className="filter-actions">
            <button type="button" className="btn sm" onClick={() => setSelectedTopics(new Set(allTopicKeys))}>All topics</button>
            <button type="button" className="btn sm" onClick={() => setSelectedTopics(new Set())}>Clear</button>
            <button type="button" className="btn sm" onClick={() => setShuffleTick((t) => t + 1)}>Shuffle</button>
          </div>
          <div className="filter-groups">
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
                    <span className="arrow" aria-hidden="true" />{subject}<span className="count">{total}</span>
                  </button>
                  <div className="topics">
                    {Object.keys(topics).map((topic) => {
                      const key = `${subject}::${topic}`;
                      return (
                        <label key={key} className="topic-row">
                          <input type="checkbox" checked={selectedTopics.has(key)}
                                 onChange={(e) => toggleTopic(key, e.target.checked)} />
                          <span className="topic-name">{topic}</span>
                          <span className="tc">{topics[topic].length}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
        <div className="study-main">
          {qIds.length === 0 ? (
            <div className="state">
              <h2>No questions match</h2>
              <p>Choose at least one topic, or clear the search.</p>
            </div>
          ) : question ? (
            <>
              <div className="sheet-head">
                <p className="sheet-count">Question {index + 1} of {qIds.length}</p>
                <p className="sheet-score">
                  <span className="good">{stats.correct} right</span>, <span className="bad">{stats.wrong} wrong</span>
                </p>
              </div>
              <SheetMap marks={liveMarks(answers, qIds, questions, true)} current={index} onJump={goTo} />
              <QuestionCard
                question={question}
                displayOrder={getDisplayOrder(qIdx)}
                index={index}
                total={qIds.length}
                answer={answers[index]}
                quizMode="study"
                subjectTitle={subjectTitle}
                onSelect={(opt) => onSelect(index, opt)}
                onPrev={() => goTo(index - 1)}
                onNext={() => goTo(index + 1)}
                onFinish={() => {}}
                onReport={() => onReport(qIdx)}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
