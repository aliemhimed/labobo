import { startTransition, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';
import ReportModal from '../components/ReportModal.jsx';
import { useLeaderboard } from '../components/Leaderboard.jsx';
import { useMeme } from '../components/MemePopup.jsx';
import { useConfirm } from '../components/Confirm.jsx';
import { useNamePrompt } from '../components/NamePrompt.jsx';
import { useToast } from '../components/Toast.jsx';
import ModeHome from './ModeHome.jsx';
import StudyView from './StudyView.jsx';
import QuizView from './QuizView.jsx';
import ConfigView from './ConfigView.jsx';
import ResultsView from './ResultsView.jsx';
import ReviewView from './ReviewView.jsx';
import Flashcards from './Flashcards.jsx';
import Dashboard from './Dashboard.jsx';
import ExamDetail from './ExamDetail.jsx';
import { initialSession, restoreSession, serializeSession, sessionReducer } from './session.js';
import { useHistory, useWrong } from '../hooks/useStore.js';
import { buildSubjectIndex } from '../lib/questions.js';
import {
  clearUser, createSubjectStore, getSkipSavePrompt, onStorageError, saveSession, setSkipSavePrompt,
} from '../lib/storage.js';
import { supaInsert } from '../lib/supabase.js';
import { ensureGuest, registerUser } from '../lib/user.js';
import { buildQuizQuestions, distribute, shuffle, uid } from '../lib/utils.js';

/* Which views need a quiz in progress, and which need a finished result. The
   view itself lives in the URL (/gct/exam, /gct/dashboard …) so the browser's
   Back button and a refresh both do the sensible thing. */
const NEEDS_QUIZ = new Set(['practice', 'exam', 'review-wrong', 'review-after-exam']);
const NEEDS_RECORD = new Set(['exam-results', 'exam-detail']);
const VIEWS = new Set([
  'home', 'study', 'practice-config', 'exam-config', 'flashcards-config', 'flashcards', 'dashboard',
  ...NEEDS_QUIZ, ...NEEDS_RECORD,
]);

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function QuizEngine({ config, questions, basePath }) {
  const store = useMemo(() => createSubjectStore(config.storagePrefix), [config.storagePrefix]);
  const subjectIndex = useMemo(() => buildSubjectIndex(questions), [questions]);
  const idToIndex = useMemo(() => {
    const m = new Map();
    questions.forEach((q, i) => m.set(q.id, i));
    return m;
  }, [questions]);

  const navigate = useNavigate();
  const location = useLocation();
  const { '*': splat = '' } = useParams();
  const view = splat.split('/')[0] || 'home';
  const go = useCallback((v, opts) => navigate(v === 'home' ? basePath : `${basePath}/${v}`, opts), [navigate, basePath]);

  const toast = useToast();
  const { confirm, element: confirmEl } = useConfirm();
  const namePrompt = useNamePrompt();
  const [user, setUserState] = useState(ensureGuest);
  const [session, dispatch] = useReducer(sessionReducer, initialSession, () => restoreSession(config.storagePrefix, idToIndex));
  const [examLength, setExamLength] = useState(() => config.examLengths[Math.min(2, config.examLengths.length - 1)]);
  const [reportFor, setReportFor] = useState(null);

  const wrong = useWrong(store);
  const history = useHistory(store);
  const leaderboard = useLeaderboard(config.leaderboardSubject);
  const [memeEl, triggerMeme, dismissMeme] = useMeme(session.mode);

  const { mode: quizMode, qIds, answers, index, record } = session;

  /* Keep an in-progress quiz across refreshes. */
  useEffect(() => {
    saveSession(config.storagePrefix, serializeSession(session, questions));
  }, [session, questions, config.storagePrefix]);

  useEffect(() => onStorageError(() => {
    toast("Couldn't save your progress: browser storage is full or blocked.");
  }), [toast]);

  /* Option shuffling is stable for as long as a question stays on screen. */
  const optionOrders = useRef(new Map());
  const getDisplayOrder = useCallback((qIdx) => {
    if (!optionOrders.current.has(qIdx)) {
      const n = questions[qIdx]?.options.length || 0;
      optionOrders.current.set(qIdx, shuffle(Array.from({ length: n }, (_, i) => i)));
    }
    return optionOrders.current.get(qIdx);
  }, [questions]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [view]);

  useEffect(() => {
    document.title = config.docTitle;
  }, [config.docTitle]);

  /* The router applies navigation as a transition, so a plain dispatch next to
     it could render first and trip the "nothing to show" redirect below. Doing
     both inside one transition makes them land in the same render. */
  const commit = useCallback((action, v, opts) => {
    startTransition(() => {
      dispatch(action);
      go(v, opts);
    });
  }, [go]);

  const goHome = useCallback(() => {
    dismissMeme();
    commit({ type: 'reset' }, 'home');
  }, [dismissMeme, commit]);

  async function logout() {
    const ok = await confirm({
      title: 'Switch user?',
      message: 'Your saved progress will remain on this device.',
      confirmLabel: 'Switch user',
    });
    if (!ok) return;
    clearUser();
    setUserState(ensureGuest());
    commit({ type: 'reset' }, 'home');
  }

  /* ── starting each mode ─────────────────────────────────────────── */

  function startSession(mode, picked) {
    optionOrders.current.clear();
    commit({ type: 'start', mode, qIds: picked }, mode);
  }

  function startConfigured(mode) {
    startSession(mode, buildQuizQuestions(distribute(examLength, config.ratio), questions));
  }

  function startReviewWrong() {
    const ids = Object.keys(wrong)
      .map((id) => idToIndex.get(id))
      .filter((i) => i !== undefined);
    if (!ids.length) {
      toast('Nothing to review: those questions are no longer in the bank.');
      return;
    }
    startSession('review-wrong', shuffle(ids));
  }

  function handleGo(key) {
    if (key === 'review-wrong') startReviewWrong();
    else if (key === 'flashcards') go('flashcards-config');
    else if (key === 'leaderboard') leaderboard.openBoard();
    else go(key); // study, practice-config, exam-config, dashboard
  }

  /* ── answering ──────────────────────────────────────────────────── */

  const selectOption = useCallback((slot, optionIdx) => {
    dispatch({ type: 'select', slot, option: optionIdx });
    const q = questions[qIds[slot]];
    if (q) triggerMeme(optionIdx === q.answer);
  }, [questions, qIds, triggerMeme]);

  const setIndex = useCallback((i) => dispatch({ type: 'goto', index: i }), []);

  /* ── finishing ──────────────────────────────────────────────────── */

  async function finishExam() {
    dismissMeme();
    let correct = 0, wrongCount = 0;
    const subjectStats = {};
    const topicStats = {};
    answers.forEach((a) => {
      const q = questions[a.qIdx];
      if (!q) return;
      const isC = a.selected !== null && a.selected === q.answer;
      if (isC) correct++; else wrongCount++;
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
    const finished = {
      id: uid(),
      date: new Date().toISOString(),
      type: quizMode === 'review-wrong' ? 'practice' : quizMode,
      questionCount: total,
      correct, wrong: wrongCount, score,
      // store question ids, not array positions — positions shift when the
      // database gains or loses rows
      questionIds: qIds.map((i) => questions[i]?.id).filter(Boolean),
      answers: answers.map((a) => a.selected),
      subjectStats, topicStats,
    };

    // Guests get their score shown either way; a name is only asked for right
    // here, where skipping it would otherwise mean losing this result.
    let effectiveUser = user;
    if (!effectiveUser?.registered && !getSkipSavePrompt()) {
      const name = await namePrompt.ask({
        title: 'Save this result?',
        message: 'Add your name to keep this score in your history and build your wrong-answer review.',
        confirmLabel: 'Save my progress',
        skipLabel: "Don't save",
      });
      if (name) {
        effectiveUser = registerUser(name);
        setUserState(effectiveUser);
      } else {
        setSkipSavePrompt();
      }
    }

    if (effectiveUser?.registered) {
      store.setHistory([finished, ...store.getHistory()]);

      const wrongMap = { ...store.getWrong() };
      answers.forEach((a) => {
        const q = questions[a.qIdx];
        if (!q) return;
        if (a.selected === null || a.selected !== q.answer) {
          wrongMap[q.id] = [...(wrongMap[q.id] || []), { date: finished.date, examId: finished.id, selected: a.selected }];
        } else {
          delete wrongMap[q.id];
        }
      });
      store.setWrong(wrongMap);
    }

    supaInsert('sessions', {
      device_id: effectiveUser?.deviceId,
      subject: config.sessionSubject,
      mode: finished.type,
      score: finished.correct,
      total: finished.questionCount,
      pct: finished.score,
    });
    if (finished.type === 'exam' && finished.questionCount === 30) {
      leaderboard.submitExam({
        score_pct: finished.score,
        total_questions: finished.questionCount,
        time_seconds: session.startedAt ? Math.round((Date.now() - session.startedAt) / 1000) : null,
      });
    }

    commit({ type: 'finish', record: finished }, 'exam-results', { replace: true });
  }

  async function promptSubmitExam() {
    const answered = answers.filter((a) => a.selected !== null).length;
    const blank = qIds.length - answered;
    const ok = await confirm({
      title: 'Submit exam now?',
      message: `Answered: ${answered}\nBlank: ${blank}\n\nBlank questions will be marked wrong.`,
      confirmLabel: 'Submit exam',
    });
    if (ok) finishExam();
  }

  async function confirmExitQuiz() {
    const answered = answers.filter((a) => a.selected !== null).length;
    const needsConfirm = quizMode === 'exam' || ((quizMode === 'practice' || quizMode === 'review-wrong') && answered > 0);
    if (needsConfirm) {
      const ok = await confirm({
        title: quizMode === 'exam' ? 'Leave the exam?' : 'Leave this session?',
        message: quizMode === 'exam' ? 'Your progress will be lost.' : 'Your progress will not be saved.',
        confirmLabel: 'Leave',
        cancelLabel: 'Stay',
        danger: true,
      });
      if (!ok) return;
    }
    goHome();
  }

  /* Re-open a saved record for review. Records store question ids, so a
     question deleted from the database since is simply skipped. */
  function openReview(rec) {
    const slots = (rec.questionIds || [])
      .map((id, i) => ({ qIdx: idToIndex.get(id), selected: rec.answers[i] }))
      .filter((s) => s.qIdx !== undefined);
    optionOrders.current.clear();
    commit({ type: 'review', slots, record: rec }, 'review-after-exam', { state: { from: view } });
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
  if (!VIEWS.has(view) || (NEEDS_QUIZ.has(view) && !qIds.length) || (NEEDS_RECORD.has(view) && !record)) {
    // Unknown address, or a quiz/result screen with nothing to show (fresh tab,
    // shared link): land on the mode menu instead of an empty page.
    return <Navigate to={basePath} replace />;
  } else {
    switch (view) {
      case 'home':
        body = (
          <ModeHome user={user}
                    wrongCount={Object.keys(wrong).length}
                    historyCount={history.length}
                    onGo={handleGo} />
        );
        break;
      case 'study':
        body = (
          <StudyView questions={questions} subjectIndex={subjectIndex}
                     getDisplayOrder={getDisplayOrder} triggerMeme={triggerMeme}
                     onReport={shared.onReport} dismissMeme={dismissMeme} onHome={goHome} />
        );
        break;
      case 'practice-config':
      case 'exam-config': {
        const mode = view === 'exam-config' ? 'exam' : 'practice';
        body = (
          <ConfigView config={config} mode={mode}
                      examLength={examLength} setExamLength={setExamLength}
                      onStart={() => startConfigured(mode)}
                      onHome={goHome} />
        );
        break;
      }
      case 'practice':
      case 'exam':
      case 'review-wrong':
        body = (
          <QuizView {...shared} onExit={confirmExitQuiz}
                    onSubmitExam={promptSubmitExam} onFinish={finishExam} />
        );
        break;
      case 'exam-results':
        body = <ResultsView record={record} onHome={goHome} onReview={() => openReview(record)} />;
        break;
      case 'review-after-exam':
        body = (
          <ReviewView {...shared}
                      onBack={() => go(location.state?.from === 'exam-detail' ? 'exam-detail' : 'exam-results')} />
        );
        break;
      case 'flashcards-config':
      case 'flashcards':
        body = (
          <Flashcards questions={questions} subjectIndex={subjectIndex} store={store}
                      started={view === 'flashcards'}
                      onStart={() => go('flashcards')}
                      onConfig={() => go('flashcards-config')}
                      onHome={goHome} />
        );
        break;
      case 'dashboard':
        body = (
          <Dashboard store={store} onHome={goHome}
                     onOpen={(rec) => commit({ type: 'view-record', record: rec }, 'exam-detail')} />
        );
        break;
      case 'exam-detail':
        body = <ExamDetail record={record} onBack={() => go('dashboard')} onReview={() => openReview(record)} />;
        break;
      default:
        body = null;
    }
  }

  return (
    <>
      <TopBar subtitle={config.title.replace(/ MCQ$/, '')} user={user}
              onBrandClick={goHome} onLogout={logout} />
      <div id="root">{body}</div>
      {memeEl}
      {leaderboard.element}
      {confirmEl}
      {namePrompt.element}
      {reportFor !== null && questions[reportFor] ? (
        <ReportModal question={questions[reportFor]} deviceId={user?.deviceId}
                     onClose={() => setReportFor(null)} />
      ) : null}
    </>
  );
}
