import { useMemo } from 'react';
import PageHead from '../components/PageHead.jsx';
import { useHistory, useWrong } from '../hooks/useStore.js';
import { Breakdown } from './Breakdown.jsx';
import { fmtDate, scoreClass } from '../lib/utils.js';

const WEAK_MIN_ANSWERS = 4;
const WEAK_SHOWN = 3;

export default function Dashboard({ store, subjectTitle, onHome, onOpen, practisable = [], onPractise }) {
  const hist = useHistory(store);
  const wrongMap = useWrong(store);
  const { wrong, avg, totalAnswered, bySubj, worst, weak } = useMemo(() => {
    const wrong = Object.keys(wrongMap).length;
    let totalAnswered = 0, totalCorrect = 0;
    const bySubj = {};
    const byTopic = {};
    hist.forEach((r) => {
      totalAnswered += r.questionCount;
      totalCorrect += r.correct;
      Object.values(r.topicStats || {}).forEach((t) => {
        const k = `${t.subject}::${t.topic}`;
        if (!byTopic[k]) byTopic[k] = { key: k, topic: t.topic, correct: 0, total: 0 };
        byTopic[k].correct += t.correct;
        byTopic[k].total += t.total;
      });
      Object.entries(r.subjectStats || {}).forEach(([s, st]) => {
        if (!bySubj[s]) bySubj[s] = { correct: 0, total: 0 };
        bySubj[s].correct += st.correct;
        bySubj[s].total += st.total;
      });
    });
    const avg = totalAnswered > 0 ? Math.round((100 * totalCorrect) / totalAnswered) : 0;

    let worst = null, worstPct = 101;
    Object.entries(bySubj).forEach(([s, st]) => {
      const p = st.total ? Math.round((100 * st.correct) / st.total) : 0;
      if (p < worstPct && st.total >= 5) { worstPct = p; worst = s; }
    });
    // Lectures with enough answers to judge, weakest first, below 75%.
    const weak = Object.values(byTopic)
      .filter((t) => t.total >= WEAK_MIN_ANSWERS && t.correct / t.total < 0.75)
      .sort((a, b) => a.correct / a.total - b.correct / b.total);
    return { wrong, avg, totalAnswered, bySubj, worst, weak };
  }, [hist, wrongMap]);
  const open = new Set(practisable);
  const weakShown = weak.filter((t) => open.has(t.key)).slice(0, WEAK_SHOWN);

  // Per-subject figures only say something when a set spans several banks.
  const multiSubject = Object.keys(bySubj).length > 1;

  return (
    <div className="container">
      <PageHead backLabel={subjectTitle} onBack={onHome} title="Performance" />

      {hist.length === 0 ? (
        <div className="state">
          <p>Finish a practice set or an exam and your results will appear here.</p>
        </div>
      ) : (
        <>
          <dl className="figures">
            <div className="figure"><dt>Sessions</dt><dd>{hist.length}</dd></div>
            <div className="figure">
              <dt>Average score</dt><dd className={'score-' + scoreClass(avg)}>{avg}%</dd>
            </div>
            <div className="figure"><dt>Questions answered</dt><dd>{totalAnswered.toLocaleString()}</dd></div>
            <div className="figure"><dt>In your wrong-answer list</dt><dd>{wrong}</dd></div>
            {multiSubject && worst ? (
              <div className="figure"><dt>Weakest subject</dt><dd className="figure-text">{worst}</dd></div>
            ) : null}
          </dl>

          {weakShown.length && onPractise ? (
            <section className="bd-section weak" aria-labelledby="dash-weak-title">
              <h2 id="dash-weak-title" className="section-title">Your weakest lectures</h2>
              <ul className="weak-list">
                {weakShown.map((t) => (
                  <li key={t.key} className="weak-row">
                    <span className="weak-name">{t.topic}</span>
                    <span className="weak-pct">{Math.round((100 * t.correct) / t.total)}% of {t.total}</span>
                    <button type="button" className="btn" onClick={() => onPractise([t.key])}>Practise this</button>
                  </li>
                ))}
              </ul>
              {weakShown.length > 1 ? (
                <button type="button" className="btn primary weak-all" onClick={() => onPractise(weakShown.map((t) => t.key))}>
                  Practise all {weakShown.length} together
                </button>
              ) : null}
            </section>
          ) : null}

          {multiSubject ? (
            <section className="bd-section" aria-labelledby="dash-subject-title">
              <h2 id="dash-subject-title" className="section-title">Accuracy by subject, all sessions</h2>
              <Breakdown stats={bySubj} />
            </section>
          ) : null}

          <section className="bd-section" aria-labelledby="dash-history-title">
            <h2 id="dash-history-title" className="section-title">History</h2>
            <div className={'history' + (multiSubject ? ' with-subjects' : '')}>
              <div className="history-row header" aria-hidden="true">
                <span>Date</span><span>Type</span><span className="ht-num">Questions</span>
                {multiSubject ? <span className="ht-subjects">By subject</span> : null}
                <span className="ht-score">Score</span>
              </div>
              {hist.map((r) => (
                <button type="button" key={r.id} className="history-row" onClick={() => onOpen(r)}
                        aria-label={`Open the ${r.type === 'exam' ? 'exam' : 'practice set'} from ${fmtDate(r.date)}, score ${r.score}%`}>
                  <span>{fmtDate(r.date)}</span>
                  <span className={'ht-type' + (r.type === 'exam' ? ' exam' : '')}>
                    {r.type === 'exam' ? 'Exam' : 'Practice'}
                  </span>
                  <span className="ht-num">{r.questionCount}</span>
                  {multiSubject ? (
                    <span className="ht-subjects">
                      {Object.entries(r.subjectStats || {}).map(([s, st]) => `${s} ${st.correct}/${st.total}`).join(', ')}
                    </span>
                  ) : null}
                  <span className={'ht-score score-' + scoreClass(r.score)}>{r.score}%</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
