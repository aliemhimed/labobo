import { useEffect, useMemo, useRef, useState } from 'react';
import QuestionCard from './QuestionCard.jsx';
import { AnswerSheet, liveMarks } from './SheetMap.jsx';
import PageHead from '../components/PageHead.jsx';
import { useTopicKeys } from '../hooks/useTopicKeys.js';
import { shuffle } from '../lib/utils.js';
import { quizStats } from './stats.js';
import { loadStudySession, saveStudySession } from '../lib/storage.js';

// Each subject's chips take a card colour, in the same order as the home deck.
const CHIP_FILLS = ['blue', 'mint', 'orange', 'violet', 'coral', 'yellow'];

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
  const [shuffleTick, setShuffleTick] = useState(0);
  // The topic chips fold away so the question comes first.
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  function toggleSubject(subject, on) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      Object.keys(subjectIndex[subject]).forEach((t) => {
        if (on) next.add(`${subject}::${t}`); else next.delete(`${subject}::${t}`);
      });
      return next;
    });
  }

  const stats = quizStats(answers, qIds, questions);
  const qIdx = qIds[index];
  const question = questions[qIdx];
  const goTo = (i) => { dismissMeme(); setIndex(i); };
  const filtered = selectedTopics.size < allTopicKeys.length || search.trim() !== '';

  return (
    <div className="container narrow">
      <PageHead backLabel={subjectTitle} onBack={() => { saveStudySession(prefix, null); onHome(); }}
                title="Study" />
      <section className="study-filter" aria-label="Choose which questions to study">
        <div className="sf-bar">
          <input type="search" className="sf-search" aria-label="Search questions" placeholder="Search questions"
                 value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" className={'sf-toggle' + (filtered ? ' active' : '')} aria-expanded={filtersOpen}
                  aria-controls="study-topics" onClick={() => setFiltersOpen((o) => !o)}>
            Topics
            <span className="sf-badge">{selectedTopics.size}/{allTopicKeys.length}</span>
          </button>
          <button type="button" className="sf-shuffle" onClick={() => setShuffleTick((t) => t + 1)}>Shuffle</button>
        </div>

        {filtersOpen ? (
          <div id="study-topics" className="sf-panel">
            <div className="sf-panel-actions">
              <button type="button" onClick={() => setSelectedTopics(new Set(allTopicKeys))}>Select all</button>
              <button type="button" onClick={() => setSelectedTopics(new Set())}>Clear</button>
              <span className="sf-total">{qIds.length} question{qIds.length !== 1 ? 's' : ''} match</span>
            </div>
            {Object.keys(subjectIndex).map((subject, si) => {
              const topics = subjectIndex[subject];
              const keys = Object.keys(topics);
              const onCount = keys.filter((t) => selectedTopics.has(`${subject}::${t}`)).length;
              const allOn = onCount === keys.length;
              return (
                <div key={subject} className={'sf-group fill-' + CHIP_FILLS[si % CHIP_FILLS.length]}>
                  <button type="button" className={'sf-subject' + (allOn ? ' on' : onCount ? ' some' : '')}
                          aria-pressed={allOn} onClick={() => toggleSubject(subject, !allOn)}>
                    <span className="sf-dot" aria-hidden="true" />
                    {subject}
                    <span className="sf-count">{onCount} of {keys.length} topics</span>
                  </button>
                  <div className="sf-chips">
                    {keys.map((topic) => {
                      const key = `${subject}::${topic}`;
                      const on = selectedTopics.has(key);
                      return (
                        <button type="button" key={key} className={'sf-chip' + (on ? ' on' : '')}
                                aria-pressed={on} onClick={() => toggleTopic(key, !on)}>
                          {topic}
                          <span className="sf-n">{topics[topic].length}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {qIds.length === 0 ? (
        <div className="state">
          <h2>No questions match</h2>
          <p>Turn on more topics or clear the search to bring questions back.</p>
          <div className="state-actions">
            <button type="button" className="btn primary"
                    onClick={() => { setSearch(''); setSelectedTopics(new Set(allTopicKeys)); }}>
              Reset topics and search
            </button>
          </div>
        </div>
      ) : question ? (
        <>
          <AnswerSheet marks={liveMarks(answers, qIds, questions, true)} current={index} onJump={goTo}
                       score={<><span className="good">{stats.correct} right</span> <span className="bad">{stats.wrong} wrong</span></>} />
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
  );
}
