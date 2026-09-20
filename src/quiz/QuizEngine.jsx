import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import ReportModal from '../components/ReportModal.jsx';
import { useMeme } from '../components/MemePopup.jsx';
import Welcome from './Welcome.jsx';
import ModeHome from './ModeHome.jsx';
import StudyView from './StudyView.jsx';
import QuizView from './QuizView.jsx';
import ConfigView from './ConfigView.jsx';
import ResultsView from './ResultsView.jsx';
import ReviewView from './ReviewView.jsx';
import Flashcards from './Flashcards.jsx';
import Dashboard from './Dashboard.jsx';
import ExamDetail from './ExamDetail.jsx';
import { buildSubjectIndex } from '../lib/questions.js';
import { createSubjectStore, getUser, clearUser } from '../lib/storage.js';
import { supaInsert } from '../lib/supabase.js';
import { buildQuizQuestions, distribute, shuffle, uid } from '../lib/utils.js';

export default function QuizEngine({ config, questions }) {
  const store = useMemo(() => createSubjectStore(config.storagePrefix), [config.storagePrefix]);
  const subjectIndex = useMemo(() => buildSubjectIndex(questions), [questions]);
  const idToIndex = useMemo(() => {
    const m = new Map();
    questions.forEach((q, i) => m.set(q.id, i));
    return m;
  }, [questions]);

  const [user, setUserState] = useState(() => getUser());
  const [view, setView] = useState(() => (getUser() ? 'home' : 'welcome'));
  const [quizMode, setQuizMode] = useState(null);
  const [qIds, setQIds] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [index, setIndex] = useState(0);
  const [examLength, setExamLength] = useState(() => config.examLengths[Math.min(2, config.examLengths.length - 1)]);
  const [viewingExam, setViewingExam] = useState(null);
  const [reportFor, setReportFor] = useState(null);
  const [historyTick, setHistoryTick] = useState(0);

  const [memeEl, triggerMeme, dismissMeme] = useMeme(quizMode);

  /* Option shuffling is stable for as long as a question stays on screen. */
  const optionOrders = useRef(new Map());
  const getDisplayOrder = useCallback((qIdx) => {
    if (!optionOrders.current.has(qIdx)) {
      const n = questions[qIdx]?.options.length || 0;
      optionOrders.current.set(qIdx, shuffle(Array.from({ length: n }, (_, i) => i)));
    }
    return optionOrders.current.get(qIdx);
  }, [questions]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [view]);

  useEffect(() => {
    document.title = config.docTitle;
  }, [config.docTitle]);

  const goHome = useCallback(() => {
    dismissMeme();
    setView(user ? 'home' : 'welcome');
  }, [user, dismissMeme]);

  function logout() {
    if (!confirm('Switch user? Your saved progress will remain on this device.')) return;
    clearUser();
    setUserState(null);
    setView('welcome');
  }

  /* ── starting each mode ─────────────────────────────────────────── */

  function startConfigured(mode) {
    const dist = distribute(examLength, config.ratio);
    const picked = buildQuizQuestions(dist, questions);
    optionOrders.current.clear();
    setQIds(picked);
    setAnswers(picked.map((idx) => ({ qIdx: idx, selected: null })));
    setIndex(0);
    setQuizMode(mode);
    setView(mode);
  }

  function startReviewWrong() {
    const wrong = store.getWrong();
    const ids = Object.keys(wrong)
      .map((id) => idToIndex.get(id))
      .filter((i) => i !== undefined);
    if (!ids.length) return;
    const picked = shuffle(ids);
    optionOrders.current.clear();
    setQIds(picked);
    setAnswers(picked.map((idx) => ({ qIdx: idx, selected: null })));
    setIndex(0);
    setQuizMode('review-wrong');
    setView('review-wrong');
  }

  function handleGo(key) {
    if (key === 'study') { setView('study'); setQuizMode('study'); }
    else if (key === 'practice-config' || key === 'exam-config') setView(key);
    else if (key === 'review-wrong') startReviewWrong();
    else if (key === 'flashcards') setView('flashcards-config');
    else if (key === 'dashboard') setView('dashboard');
    else if (key === 'leaderboard') {
      if (window.LABOBO_LEADERBOARD) {
        window.LABOBO_LEADERBOARD.showLeaderboardModal(config.leaderboardSubject);
      }
    }
  }

  /* ── answering ──────────────────────────────────────────────────── */

  const selectOption = useCallback((slot, optionIdx) => {
    setAnswers((prev) => {
      const next = prev.slice();
      next[slot] = { ...next[slot], selected: optionIdx };
      return next;
    });
    const q = questions[qIds[slot]];
    if (q) triggerMeme(optionIdx === q.answer);
  }, [questions, qIds, triggerMeme]);

  /* ── finishing ──────────────────────────────────────────────────── */

  function finishExam() {
    dismissMeme();
    let correct = 0, wrong = 0;
    const subjectStats = {};
    const topicStats = {};
    answers.forEach((a) => {
      const q = questions[a.qIdx];
      if (!q) return;
      const isC = a.selected !== null && a.selected === q.answer;
      if (isC) correct++; else wrong++;
      if (!subjectStats[q.subject]) subjectStats[q.subject] = { correct: 0, total: 0 };
      subjectStats[q.subject].total++;
      if (isC) subjectStats[q.subject].correct++;
      const tk = q.subject + '::' + q.topic;
      if (!topicStats[tk]) topicStats[tk] = { subject: q.subject, topic: q.topic, correct: 0, total: 0 };
      topicStats[tk].total++;
      if (isC) topicStats[tk].correct++;
    });

    const total = qIds.length;
    const score = total > 0 ? Math.round((100 * correct) / total) : 0;
    const record = {
      id: uid(),
      date: new Date().toISOString(),
      type: quizMode === 'review-wrong' ? 'practice' : quizMode,
      questionCount: total,
      correct, wrong, score,
      // store question ids, not array positions — positions shift when the
      // database gains or loses rows
      questionIds: qIds.map((i) => questions[i]?.id).filter(Boolean),
      answers: answers.map((a) => a.selected),
      subjectStats, topicStats,
    };

    if (user && user.registered) {
      const hist = store.getHistory();
      hist.unshift(record);
      store.setHistory(hist.slice(0, 200));

      const wrongMap = store.getWrong();
      answers.forEach((a) => {
        const q = questions[a.qIdx];
        if (!q) return;
        if (a.selected === null || a.selected !== q.answer) {
          wrongMap[q.id] = wrongMap[q.id] || [];
          wrongMap[q.id].push({ date: record.date, examId: record.id, selected: a.selected });
        } else {
          delete wrongMap[q.id];
        }
      });
      store.setWrong(wrongMap);
      setHistoryTick((t) => t + 1);
    }

    supaInsert('sessions', {
      device_id: user?.deviceId,
      subject: config.sessionSubject,
      mode: record.type,
      score: record.correct,
      total: record.questionCount,
      pct: record.score,
    });
    if (record.type === 'exam' && record.questionCount === 30 && window.LABOBO_LEADERBOARD) {
      window.LABOBO_LEADERBOARD.handleExamSubmission({
        subject: config.leaderboardSubject,
        score_pct: record.score,
        total_questions: record.questionCount,
        time_seconds: null,
      });
    }

    setViewingExam(record);
    setView('exam-results');
  }

  function promptSubmitExam() {
    const answered = answers.filter((a) => a.selected !== null).length;
    const blank = qIds.length - answered;
    if (!confirm(`Submit exam now?\n\nAnswered: ${answered}\nBlank: ${blank}\n\nBlank questions will be marked wrong.`)) return;
    finishExam();
  }

  function confirmExitQuiz() {
    if (quizMode === 'exam') {
      if (!confirm('Leave the exam? Your progress will be lost.')) return;
    } else if (quizMode === 'practice' || quizMode === 'review-wrong') {
      const answered = answers.filter((a) => a.selected !== null).length;
      if (answered > 0 && !confirm('Leave this session? Your progress will not be saved.')) return;
    }
    goHome();
  }

  /* Re-open a saved record for review. Records store question ids, so a
     question deleted from the database since is simply skipped. */
  function openReview(record) {
    const slots = (record.questionIds || [])
      .map((id, i) => ({ qIdx: idToIndex.get(id), selected: record.answers[i] }))
      .filter((s) => s.qIdx !== undefined);
    optionOrders.current.clear();
    setQIds(slots.map((s) => s.qIdx));
    setAnswers(slots.map((s) => ({ qIdx: s.qIdx, selected: s.selected })));
    setIndex(0);
    setViewingExam(record);
    setQuizMode('review-after-exam');
    setView('review-after-exam');
  }

  /* ── rendering ──────────────────────────────────────────────────── */

  const shared = {
    config, questions, subjectIndex, store, user,
    qIds, answers, index, quizMode,
    setIndex, getDisplayOrder,
    onSelect: selectOption,
    onReport: (qIdx) => setReportFor(qIdx),
    dismissMeme,
  };

  let body;
  if (!user) {
    body = (
      <Welcome config={config} totalQuestions={questions.length}
               onReady={(u) => { setUserState(u); setView('home'); }} />
    );
  } else {
    switch (view) {
      case 'home':
        body = (
          <ModeHome user={user}
                    wrongCount={Object.keys(store.getWrong()).length}
                    historyCount={store.getHistory().length}
                    onGo={handleGo} />
        );
        break;
      case 'study':
        body = <StudyView {...shared} setQIds={setQIds} setAnswers={setAnswers} onHome={goHome} />;
        break;
      case 'practice-config':
      case 'exam-config':
        body = (
          <ConfigView config={config} mode={view === 'exam-config' ? 'exam' : 'practice'}
                      examLength={examLength} setExamLength={setExamLength}
                      onStart={() => startConfigured(view === 'exam-config' ? 'exam' : 'practice')}
                      onHome={goHome} />
        );
        break;
      case 'practice':
      case 'exam':
      case 'review-wrong':
        body = (
          <QuizView {...shared} onExit={confirmExitQuiz}
                    onSubmitExam={promptSubmitExam} onFinish={finishExam} />
        );
        break;
      case 'exam-results':
        body = (
          <ResultsView record={viewingExam} onHome={goHome}
                       onReview={() => openReview(viewingExam)} />
        );
        break;
      case 'review-after-exam':
        body = (
          <ReviewView {...shared}
                      onBack={() => setView(viewingExam ? 'exam-results' : 'dashboard')} />
        );
        break;
      case 'flashcards-config':
      case 'flashcards':
        body = (
          <Flashcards questions={questions} subjectIndex={subjectIndex} store={store}
                      started={view === 'flashcards'}
                      onStart={() => setView('flashcards')}
                      onConfig={() => setView('flashcards-config')}
                      onHome={goHome} />
        );
        break;
      case 'dashboard':
        body = (
          <Dashboard store={store} tick={historyTick} onHome={goHome}
                     onOpen={(rec) => { setViewingExam(rec); setView('exam-detail'); }} />
        );
        break;
      case 'exam-detail':
        body = (
          <ExamDetail record={viewingExam} onBack={() => setView('dashboard')}
                      onReview={() => openReview(viewingExam)} />
        );
        break;
      default:
        body = <ModeHome user={user} wrongCount={0} historyCount={0} onGo={handleGo} />;
    }
  }

  return (
    <>
      <TopBar subtitle={config.title.replace(/ MCQ$/, '')} user={user}
              onBrandClick={goHome} onLogout={logout} />
      <div id="root">{body}</div>
      {memeEl}
      {reportFor !== null && questions[reportFor] ? (
        <ReportModal question={questions[reportFor]} deviceId={user?.deviceId}
                     onClose={() => setReportFor(null)} />
      ) : null}
    </>
  );
}
