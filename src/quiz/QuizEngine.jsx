import { startTransition, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';
import ReportModal from '../components/ReportModal.jsx';
import { useLeaderboard } from '../components/Leaderboard.jsx';
import { useMeme } from '../components/MemePopup.jsx';
import { useConfirm } from '../components/Confirm.jsx';
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
import { GuideReader, GuidesLibrary } from './Guides.jsx';
import { findGuide, useGuideCatalog } from '../lib/guides.js';
import { openSubscribeDialog } from '../lib/access.js';
import { prefersReducedMotion } from '../lib/settings.js';
import { initialSession, restoreSession, serializeSession, sessionReducer } from './session.js';
import { useHistory, useSrs, useStarred, useWrong } from '../hooks/useStore.js';
import { dueIds, dueTomorrow, updateSrs } from '../lib/srs.js';
import { StarContext, starredIds } from './stars.js';
import { buildSubjectIndex } from '../lib/questions.js';
import { createSubjectStore, loadOptionSeed, onStorageError, saveOptionSeed, saveSession } from '../lib/storage.js';
import { supaInsert } from '../lib/supabase.js';
import { recordAnswers } from '../lib/answers.js';
import { useAuth, signOut } from '../lib/auth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { buildQuizFromTopics, optionOrder, shuffle, uid } from '../lib/utils.js';
import { drawDailySet } from '../lib/daily.js';
import { questionsFromRows } from '../lib/questions.js';
import { useQueryClient } from '@tanstack/react-query';
import { useTopicKeys } from '../hooks/useTopicKeys.js';

/* Which views need a quiz in progress, and which need a finished result. The
   view itself lives in the URL (/gct/exam, /gct/dashboard …) so the browser's
   Back button and a refresh both do the sensible thing. */
const NEEDS_QUIZ = new Set(['practice', 'exam', 'review-wrong', 'review-after-exam']);
const NEEDS_RECORD = new Set(['exam-results', 'exam-detail']);
const VIEWS = new Set([
  'home', 'study', 'practice-config', 'exam-config', 'flashcards-config', 'flashcards', 'dashboard', 'guides',
  ...NEEDS_QUIZ, ...NEEDS_RECORD,
]);

const VIEW_TITLES = {
  study: 'Study', 'practice-config': 'Practice', 'exam-config': 'Exam', practice: 'Practice', exam: 'Exam',
  'review-wrong': 'Review', 'review-after-exam': 'Review answers', 'exam-results': 'Results',
  'exam-detail': 'Session details', 'flashcards-config': 'Flashcards', flashcards: 'Flashcards',
  dashboard: 'Performance', guides: 'Study guides',
};

const NO_EXTRA = [];

/* `questions` is the open bank. `extra` holds the questions of the free
   plan's daily sets from the locked lectures (`daily`, see
   src/lib/questions.js): they are appended after the bank, so a session can
   use them, but stay out of the lecture lists. */
export default function QuizEngine({ config, questions: bank, extra = NO_EXTRA, daily = null, basePath }) {
  const store = useMemo(() => createSubjectStore(config.storagePrefix), [config.storagePrefix]);
  const questions = useMemo(() => (extra.length ? [...bank, ...extra] : bank), [bank, extra]);
  const subjectIndex = useMemo(() => buildSubjectIndex(bank), [bank]);
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
  // Everyone reaching this component is already signed in (AuthGate) with a
  // semester chosen (SemesterGate) — there is no guest mode any more.
  const { user: authUser } = useAuth();
  const { catalog: guideCatalog } = useGuideCatalog();
  const { data: profile } = useProfile();
  const user = useMemo(() => ({
    name: profile?.username || authUser?.user_metadata?.full_name || authUser?.email || '',
    deviceId: authUser?.id,
    registered: true,
  }), [authUser, profile]);
  const [session, dispatch] = useReducer(sessionReducer, initialSession, () => restoreSession(config.storagePrefix, idToIndex));
  const [examLength, setExamLength] = useState(() => config.examLengths[Math.min(2, config.examLengths.length - 1)]);
  /* The lectures a practice set or exam is drawn from. null means "all of
     them", which is also what a lecture that appears later (a pass switched
     on mid-visit) should fall into; a hand-picked set is kept to the
     lectures that still exist. */
  const allTopicKeys = useTopicKeys(subjectIndex);
  const [pickedTopics, setPickedTopics] = useState(null);
  const chosenTopics = useMemo(() => {
    if (!pickedTopics) return new Set(allTopicKeys);
    return new Set(allTopicKeys.filter((k) => pickedTopics.has(k)));
  }, [allTopicKeys, pickedTopics]);
  const [reportFor, setReportFor] = useState(null);
  // "Clinical cases only": draw the set from case-vignette questions alone.
  const [clinicalOnly, setClinicalOnly] = useState(false);

  const wrong = useWrong(store);
  const history = useHistory(store);
  const srs = useSrs(store);
  const starred = useStarred(store);
  const due = useMemo(() => dueIds(srs, wrong), [srs, wrong]);
  const starList = useMemo(() => starredIds(starred), [starred]);
  const stars = useMemo(() => ({
    isStarred: (id) => !!starred[id]?.on,
    toggle: (id) => {
      const cur = store.getStarred();
      store.setStarred({ ...cur, [id]: { on: !cur[id]?.on, at: Date.now() } });
    },
  }), [starred, store]);
  const leaderboard = useLeaderboard(config.leaderboardSubject);
  const [memeEl, triggerMeme, dismissMeme] = useMeme(session.mode);

  const { mode: quizMode, qIds, answers, index, record, kind: reviewKind } = session;

  /* Keep an in-progress quiz across refreshes. */
  useEffect(() => {
    saveSession(config.storagePrefix, serializeSession(session, questions));
  }, [session, questions, config.storagePrefix]);

  useEffect(() => onStorageError(() => {
    toast("Couldn't save your progress: browser storage is full or blocked.");
  }), [toast]);

  /* Each question's option order is derived from a per-session seed and the
     question id, so it stays put across a refresh (the seed is kept in
     sessionStorage) and only changes when a new session picks a new seed.
     The cache hands back the same array each render, which QuestionCard's
     effects rely on. */
  const [optionSeed, setOptionSeed] = useState(() => loadOptionSeed(config.storagePrefix) || uid());
  useEffect(() => { saveOptionSeed(config.storagePrefix, optionSeed); }, [config.storagePrefix, optionSeed]);
  const optionOrders = useMemo(() => new Map(), [questions, optionSeed]);
  const getDisplayOrder = useCallback((qIdx) => {
    if (!optionOrders.has(qIdx)) {
      const q = questions[qIdx];
      optionOrders.set(qIdx, optionOrder(q?.options || [], `${optionSeed}:${q?.id}`));
    }
    return optionOrders.get(qIdx);
  }, [questions, optionSeed, optionOrders]);

  useEffect(() => {
    // A guide sets its own scroll position (top, a heading, or where the student stopped).
    if (view === 'guides' && splat.split('/').length > 1) return;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [view, splat]);

  /* The tab title names the screen as well as the subject, so history and
     bookmarks tell an exam apart from a guide. */
  const [, guideFolder, guideSlug] = view === 'guides' ? splat.split('/') : [];
  const guideTitle = guideSlug ? findGuide(guideCatalog, config.path, guideFolder, guideSlug)?.title : null;
  useEffect(() => {
    const screen = guideTitle || VIEW_TITLES[view];
    document.title = screen ? `${screen} · ${config.docTitle}` : config.docTitle;
  }, [config.docTitle, view, guideTitle]);

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
      title: 'Sign out?',
      message: 'Your progress is saved to your account, so it will be here next time you sign in.',
      confirmLabel: 'Sign out',
    });
    if (!ok) return;
    commit({ type: 'reset' }, 'home');
    await signOut();
    // AuthGate re-renders to the login screen as soon as the session clears.
  }

  /* ── starting each mode ─────────────────────────────────────────── */

  function startSession(mode, picked, custom = false, kind = null) {
    setOptionSeed(uid());
    commit({ type: 'start', mode, qIds: picked, custom, kind }, mode);
  }

  function startConfigured(mode) {
    const picked = buildQuizFromTopics(examLength, config.ratio, questions, chosenTopics, clinicalOnly);
    if (!picked.length) return;
    startSession(mode, picked, chosenTopics.size < allTopicKeys.length || clinicalOnly);
  }

  /* The free plan's daily set: the server draws it and keeps it, the
     questions join the cache, and the session starts once they are in. */
  const queryClient = useQueryClient();
  const [pendingDaily, setPendingDaily] = useState(null);
  async function startDaily(mode, request) {
    let reply;
    try {
      reply = await drawDailySet({ subject: config.path, mode, ...request });
    } catch (e) {
      toast(e.message || 'Couldn’t start the set. Try again.');
      if (e.status === 409) queryClient.invalidateQueries({ queryKey: ['questions', config.storagePrefix] });
      return;
    }
    const fresh = questionsFromRows(config, reply.set.rows);
    queryClient.setQueryData(['questions', config.storagePrefix], (old) => old && ({
      ...old,
      extra: [...(old.extra || []), ...fresh],
      daily: { ...old.daily, sets: { ...(old.daily?.sets || {}), [mode]: { scope: reply.set.scope, ids: reply.set.ids } } },
    }));
    setPendingDaily({ mode, ids: reply.set.ids });
  }
  useEffect(() => {
    if (!pendingDaily) return;
    const picked = pendingDaily.ids.map((id) => idToIndex.get(id)).filter((i) => i !== undefined);
    if (!picked.length) return; // the new questions haven't arrived yet
    setPendingDaily(null);
    // A set from the locked lectures is never the whole subject, so it stays
    // off the leaderboard.
    startSession(pendingDaily.mode, picked, true);
  }, [pendingDaily, idToIndex]); // startSession is a plain function, new each render

  /* Wrong answers, questions due for spaced review, and starred questions
     all run as a 'review-wrong' set; `kind` names the screen. */
  function startReviewList(kind, list, keepOrder = false) {
    const ids = list
      .map((id) => idToIndex.get(id))
      .filter((i) => i !== undefined);
    if (!ids.length) {
      toast('Nothing to review: those questions are no longer in the bank.');
      return;
    }
    startSession('review-wrong', keepOrder ? ids : shuffle(ids), false, kind);
  }

  function handleGo(key) {
    if (key === 'review-wrong') startReviewList('wrong', Object.keys(wrong));
    else if (key === 'review-due') startReviewList('due', due);
    else if (key === 'starred') startReviewList('starred', starList, true);
    else if (key === 'flashcards') go('flashcards-config');
    else if (key === 'leaderboard') leaderboard.openBoard();
    else go(key); // study, practice-config, exam-config, dashboard
  }

  /* A link from the home page can ask for a set straight away
     ("3 questions due for review"). Run it once, then drop the request so
     Back and refresh don't start it again. */
  const startRequest = view === 'home' ? location.state?.start : null;
  useEffect(() => {
    if (startRequest !== 'review-due') return;
    navigate(location.pathname, { replace: true, state: null });
    if (due.length) handleGo('review-due');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRequest]);

  /* ── answering ──────────────────────────────────────────────────── */

  const selectOption = useCallback((slot, optionIdx) => {
    dispatch({ type: 'select', slot, option: optionIdx });
    const q = questions[qIds[slot]];
    if (q) triggerMeme(optionIdx === q.answer);
  }, [questions, qIds, triggerMeme]);

  const setIndex = useCallback((i) => dispatch({ type: 'goto', index: i }), []);

  /* ── finishing ──────────────────────────────────────────────────── */

  function finishExam() {
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

    // Everyone is signed in, so every result is saved — no guest/skip flow.
    store.setHistory([finished, ...store.getHistory()]);
    const wrongMap = { ...store.getWrong() };
    const cleared = { ...store.getCleared() };
    answers.forEach((a) => {
      const q = questions[a.qIdx];
      if (!q) return;
      if (a.selected === null || a.selected !== q.answer) {
        wrongMap[q.id] = [...(wrongMap[q.id] || []), { date: finished.date, examId: finished.id, selected: a.selected }];
      } else {
        delete wrongMap[q.id];
        cleared[q.id] = finished.date; // tells the account sync it was answered right since
      }
    });
    store.setWrong(wrongMap);
    store.setCleared(cleared);
    store.setSrs(updateSrs(store.getSrs(), answers.map((a) => {
      const q = questions[a.qIdx];
      return { id: q?.id, correct: !!q && a.selected !== null && a.selected === q.answer };
    })));

    supaInsert('sessions', {
      subject: config.sessionSubject,
      mode: finished.type,
      score: finished.correct,
      total: finished.questionCount,
      pct: finished.score,
    });
    // Per-question picks for the admin's "most missed" list. Review-wrong
    // replays only questions this student already missed, which would skew it.
    if (quizMode !== 'review-wrong') {
      recordAnswers(answers.map((a) => ({ id: questions[a.qIdx]?.id, pick: a.selected })));
    }
    // The board compares like with like: 30 questions from the whole subject.
    if (finished.type === 'exam' && finished.questionCount === 30 && !session.custom) {
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
      message: blank
        ? `You've answered ${answered} of ${qIds.length}. The ${blank} blank question${blank === 1 ? '' : 's'} will be marked wrong.`
        : `You've answered all ${qIds.length} questions.`,
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

  /* Re-open a saved record for review, optionally at question `at` of the
     record. Records store question ids, so a question deleted from the
     database since is simply skipped. */
  function openReview(rec, at = 0) {
    const slots = (rec.questionIds || [])
      .map((id, i) => ({ qIdx: idToIndex.get(id), selected: rec.answers[i], at: i }))
      .filter((s) => s.qIdx !== undefined);
    const index = Math.max(0, slots.findIndex((s) => s.at === at));
    commit({ type: 'review', slots, record: rec, index }, 'review-after-exam', { state: { from: view } });
  }

  /* Right/wrong per question of a finished record, for the results sheet. */
  const recordMarks = (rec) => (rec?.questionIds || []).map((id, i) => {
    const q = questions[idToIndex.get(id)];
    if (!q) return null;
    return rec.answers[i] === q.answer ? 'correct' : 'wrong';
  });

  const subjectTitle = config.title.replace(/ MCQ$/, '');
  const topicCount = Object.values(subjectIndex).reduce((n, topics) => n + Object.keys(topics).length, 0);

  /* ── rendering ──────────────────────────────────────────────────── */

  const shared = {
    config, questions, subjectIndex, store, user,
    qIds, answers, index, quizMode, reviewKind,
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
          <ModeHome title={subjectTitle}
                    subjectKey={config.path}
                    questionCount={bank.length}
                    topicCount={topicCount}
                    wrongCount={Object.keys(wrong).length}
                    dueCount={due.length}
                    dueTomorrowCount={dueTomorrow(srs)}
                    starredCount={starList.length}
                    historyCount={history.length}
                    onGo={handleGo} />
        );
        break;
      case 'study':
        body = (
          <StudyView questions={questions} subjectIndex={subjectIndex} subjectTitle={subjectTitle}
                     prefix={config.storagePrefix}
                     getDisplayOrder={getDisplayOrder} triggerMeme={triggerMeme}
                     onReport={shared.onReport} dismissMeme={dismissMeme} onHome={goHome} />
        );
        break;
      case 'practice-config':
      case 'exam-config': {
        const mode = view === 'exam-config' ? 'exam' : 'practice';
        body = (
          <ConfigView config={config} mode={mode} questions={questions} subjectIndex={subjectIndex}
                      chosen={chosenTopics} allKeys={allTopicKeys} onChoose={setPickedTopics}
                      examLength={examLength} setExamLength={setExamLength}
                      clinicalOnly={clinicalOnly} setClinicalOnly={setClinicalOnly}
                      onStart={() => startConfigured(mode)}
                      daily={daily} onStartDaily={(request) => startDaily(mode, request)}
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
        body = (
          <ResultsView record={record} marks={recordMarks(record)} subjectTitle={subjectTitle}
                       onHome={goHome} onReview={(at) => openReview(record, at)} />
        );
        break;
      case 'review-after-exam':
        body = (
          <ReviewView {...shared}
                      backLabel={location.state?.from === 'exam-detail' ? 'Session details' : 'Results'}
                      onBack={() => go(location.state?.from === 'exam-detail' ? 'exam-detail' : 'exam-results')} />
        );
        break;
      case 'flashcards-config':
      case 'flashcards':
        body = (
          <Flashcards questions={questions} subjectIndex={subjectIndex} store={store}
                      subjectTitle={subjectTitle}
                      started={view === 'flashcards'}
                      onStart={() => go('flashcards')}
                      onConfig={() => go('flashcards-config')}
                      onHome={goHome} />
        );
        break;
      case 'dashboard':
        body = (
          <Dashboard store={store} subjectTitle={subjectTitle} onHome={goHome}
                     practisable={allTopicKeys}
                     onPractise={(keys) => { setPickedTopics(new Set(keys)); go('practice-config'); }}
                     onOpen={(rec) => commit({ type: 'view-record', record: rec }, 'exam-detail')} />
        );
        break;
      case 'exam-detail':
        body = <ExamDetail record={record} onBack={() => go('dashboard')} onReview={() => openReview(record)} />;
        break;
      case 'guides': {
        const [, folder, slug] = splat.split('/');
        const read = (g) => go(`guides/${g.path}`);
        if (!folder || !slug) {
          body = <GuidesLibrary subjectKey={config.path} subjectTitle={subjectTitle} onBack={goHome} onRead={read} onUnlock={openSubscribeDialog} />;
          break;
        }
        // The guide's lectures the student can practise now (a locked one is not in allTopicKeys).
        const guide = findGuide(guideCatalog, config.path, folder, slug);
        const keys = guide ? guide.topics.map((t) => `${guide.part}::${t}`).filter((k) => allTopicKeys.includes(k)) : [];
        body = (
          <GuideReader subjectKey={config.path} subjectTitle={subjectTitle} folder={folder} slug={slug}
                       canPractise={keys.length > 0}
                       onPractise={() => { setPickedTopics(new Set(keys)); go('practice-config'); }}
                       onUnlock={openSubscribeDialog}
                       onBack={() => go('guides')} onRead={read} />
        );
        break;
      }
      default:
        body = null;
    }
  }

  return (
    <StarContext.Provider value={stars}>
      <TopBar subtitle={subjectTitle} onBrandClick={goHome} onLogout={logout} />
      <main id="main" tabIndex={-1}>{body}</main>
      {memeEl}
      {leaderboard.element}
      {confirmEl}
      {reportFor !== null && questions[reportFor] ? (
        <ReportModal question={questions[reportFor]} onClose={() => setReportFor(null)} />
      ) : null}
    </StarContext.Provider>
  );
}
