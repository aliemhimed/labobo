import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStorageVersion, getSubjectSummary, subscribe } from '../lib/storage.js';
import { fetchTableCounts } from '../lib/questions.js';
import { readStudyLog } from '../lib/streak.js';
import { useAuth } from '../lib/auth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { ThemeToggle } from '../components/ThemeIcons.jsx';
import ProfileMenu from '../components/ProfileMenu.jsx';
import AnnouncementBanner from '../components/AnnouncementBanner.jsx';
import { SUBJECTS, inSemester } from '../lib/subjects.js';
import { questionsQuery } from '../hooks/useQuestions.js';
import { loadSubjectPage } from './loadSubjectPage.js';

const RESUME_LABEL = {
  practice: 'Practice in progress',
  exam: 'Exam in progress',
  'review-wrong': 'Wrong-answer review in progress',
};

const MedArtIcon = () => (
  /* Paintbrush + stethoscope: the arms form a Y at the top, the tube curves
     down into a brush handle with the ferrule and bristles bottom-right. */
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7" cy="4" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="17" cy="4" r="1.6" fill="currentColor" stroke="none" />
    <path d="M7 5.5v4.5a5 5 0 0 0 10 0V5.5" />
    <path d="M12 14.5v3.5a4 4 0 0 0 4 4l4.2 0" />
    <rect x="19.5" y="20.6" width="5" height="3" rx="0.7" transform="rotate(45 22 22.1)"
          fill="currentColor" stroke="none" />
    <path d="M23.5 22.5l5.5 5.5M22 23.8l5.2 5.2M20.6 25.3l4 4" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="27.5" cy="20" r="0.9" fill="currentColor" stroke="none" opacity="0.65" />
    <circle cx="29" cy="22.7" r="0.55" fill="currentColor" stroke="none" opacity="0.45" />
  </svg>
);

/* How each subject looks as a flashcard. Topics are the short pills on the
   card; a subject missing here falls back to its registry description. */
const DECK_LOOK = {
  gct: { glyph: '🧬', fill: 'blue', topics: ['Molecular Biology', 'Biochemistry', 'Histology', 'Medical Genetics'] },
  'body-systems': { glyph: '🫀', fill: 'mint', topics: ['Anatomy', 'Physiology', 'Medical Imaging'] },
  chemistry: { glyph: '⚗️', fill: 'orange', topics: ['Matter', 'Thermodynamics', 'Kinetics', 'Solutions', 'Acids & Bases'] },
  physics: { glyph: '⚡', fill: 'violet', topics: ['Biomechanics', 'Waves', 'Sound', 'Hydrodynamics'] },
  clinical: { glyph: '💉', fill: 'coral', topics: ['Injections', 'Infection control', 'Drug administration', 'Vital signs'] },
  'medicine-art': { glyph: <MedArtIcon />, fill: 'yellow', topics: ['Art & anatomy', 'Doctors in art', 'Photography', 'AIDS art'] },
  'gct-2': { glyph: '🧬', fill: 'blue', topics: ['Molecular Biology', 'Biochemistry', 'Histology', 'Medical Genetics'] },
  'body-systems-2': { glyph: '🫀', fill: 'mint', topics: ['Anatomy', 'Physiology', 'Medical Imaging'] },
  'clinical-2': { glyph: '💉', fill: 'coral', topics: ['Clinical procedures', 'Communication', 'Professional practice'] },
  'scientific-reasoning': { glyph: '🔬', fill: 'violet', topics: ['Health research process'] },
};
const FALLBACK_FILLS = ['blue', 'mint', 'orange', 'violet', 'coral', 'yellow'];
// Resting angle of each card in the deck, cycled.
const TILTS = [-1.6, 1.2, 1.4, -1.3, -1.1, 1.7];

// Built from the subject registry so this list can't drift from what the
// subject pages actually offer, then filtered to the user's semester.
const ALL_SUBJECTS = Object.entries(SUBJECTS).map(([key, cfg], i) => {
  const look = DECK_LOOK[key] || {};
  return {
    key,
    to: `/${key}`,
    name: cfg.title.replace(/ MCQ$/, ''),
    glyph: look.glyph || '📘',
    fill: look.fill || FALLBACK_FILLS[i % FALLBACK_FILLS.length],
    topics: look.topics || cfg.description.split(/,\s*|\s+&\s+/).filter((t) => t && t !== 'more'),
    sources: cfg.sources,
    storagePrefix: cfg.storagePrefix,
    semester: cfg.semester,
  };
});

const QUIPS = [
  'Water first. Then flashcards.',
  'Wrong answers are just spaced repetition in disguise.',
  'Ten questions now beats a three-hour panic later.',
  'Sleep is part of the syllabus.',
  'Explain it out loud. If you stumble, that is the gap.',
  'Your future patients are rooting for you.',
];

function bubbleText(log) {
  if (log.streak > 0 && log.studiedToday) {
    return `Day ${log.streak} done. Come back tomorrow and it becomes ${log.streak + 1}.`;
  }
  if (log.streak > 0) return `Finish a set today and your ${log.streak}-day streak lives on.`;
  if (log.answered > 0) return 'Your streak starts again with one set today.';
  return 'Finish one practice set or exam today to start a streak.';
}

/* Five bubbles per deck: your last five sessions, oldest to newest, marked
   like an answer sheet (mint at 60% or better, coral below). Unplayed slots stay empty. */
function MiniSheet({ scores }) {
  const slots = Array.from({ length: 5 }, (_, i) => scores[i - (5 - scores.length)]);
  const label = scores.length
    ? `Last ${scores.length} session${scores.length > 1 ? 's' : ''}: ${scores.map((n) => n + '%').join(', ')}`
    : 'No sessions yet';
  return (
    <span className="mini-sheet" role="img" aria-label={label} title={label}>
      {slots.map((sc, i) => (
        <i key={i} className={sc === undefined ? '' : sc >= 60 ? 'correct' : 'wrong'} />
      ))}
    </span>
  );
}

function StudyLog({ log }) {
  return (
    <section className="log" aria-label="Your study streak">
      <p className="log-head">
        <span className="log-flame" aria-hidden="true">🔥</span>
        <span className="log-num">{log.streak}</span>
        <span className="log-unit">day streak</span>
      </p>
      <ol className="log-week">
        {log.week.map((d) => (
          <li key={d.idx} className={(d.done ? 'done ' : '') + (d.today ? 'today' : '')}>
            <span className="log-dot" aria-hidden="true">{d.date}</span>
            <span className="log-day" aria-hidden="true">{d.label.charAt(0)}</span>
            <span className="sr-only">{d.today ? 'Today' : d.label}: {d.done ? 'studied' : 'not studied'}</span>
          </li>
        ))}
      </ol>
      <p className="log-foot">
        {log.answered > 0
          ? `${log.answered.toLocaleString()} questions answered, ${log.accuracy}% correct.`
          : 'Finished practice sets and exams count toward your streak.'}
      </p>
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [progress, setProgress] = useState({});
  const [quip, setQuip] = useState(null);
  const [hop, setHop] = useState(0);
  const quipIdx = useRef(-1);

  const semester = profile?.semester;
  const subjects = ALL_SUBJECTS.filter((s) => inSemester(s, semester));
  // Re-read when progress changes, e.g. when the account sync brings in
  // quizzes finished on another device.
  const storageVersion = useSyncExternalStore(subscribe, getStorageVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const log = useMemo(() => readStudyLog(), [storageVersion]);

  useEffect(() => { document.title = 'Studywith Labobo'; }, []);

  // Every card leads to the subject page, so fetch its code once the home
  // page has settled rather than after the click.
  useEffect(() => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => { loadSubjectPage().catch(() => { /* the route retries on click */ }); });
    return () => cancel(id);
  }, []);

  // Start downloading a subject's bank as soon as its card is hovered, focused
  // or touched; the subject page then usually finds it already cached.
  const queryClient = useQueryClient();
  const prefetch = (key) => () => { queryClient.prefetchQuery(questionsQuery(SUBJECTS[key])); };
  const intent = (key) => ({ onPointerEnter: prefetch(key), onFocus: prefetch(key), onTouchStart: prefetch(key) });

  // Progress is a handful of synchronous localStorage reads — cheap enough
  // to redo whenever storage changes.
  useEffect(() => {
    setProgress(Object.fromEntries(subjects.map((s) => [s.key, getSubjectSummary(s.storagePrefix)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester, storageVersion]);

  // One request for every table on the page, cached for a few minutes so
  // coming back to the home page shows the counts straight away. They fill in
  // after the cards are already usable either way.
  const tables = subjects.flatMap((s) => s.sources.map((src) => src.table));
  const { data: tableCounts } = useQuery({
    queryKey: ['question-counts', tables],
    queryFn: ({ signal }) => fetchTableCounts(tables, signal),
    enabled: tables.length > 0,
    staleTime: 5 * 60_000,
  });
  // A subject's count is the sum of its tables; a table that couldn't be
  // counted contributes 0.
  const counts = tableCounts
    ? Object.fromEntries(subjects.map((s) => [s.key, s.sources.reduce((n, src) => n + (tableCounts[src.table] ?? 0), 0)]))
    : {};

  const resumable = subjects.filter((s) => progress[s.key]?.resumeMode);

  const fullName = profile?.username || user?.user_metadata?.full_name || '';
  const firstName = fullName.includes('@') ? '' : fullName.trim().split(/\s+/)[0];

  function poke() {
    quipIdx.current = (quipIdx.current + 1) % QUIPS.length;
    setQuip(QUIPS[quipIdx.current]);
    setHop((n) => n + 1);
  }

  return (
    <>
      <header className="appbar">
        <span className="wordmark">
          <img src="/theme/app-icon.webp" alt="" width="40" height="40" />
          <span>Studywith <b>Labobo</b></span>
        </span>
        <div className="appbar-actions">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>

      <main className="home">
        <aside className="home-side">
          <p className="say" role="status">{quip || bubbleText(log)}</p>
          <button type="button" className="mascot" onClick={poke} aria-label="Labobo, tap for a study tip">
            <img key={hop} className={hop ? 'hop' : ''} src="/theme/mascot-lg.webp"
                 width="400" height="732" alt="" draggable="false" />
          </button>
          <StudyLog log={log} />
        </aside>

        <div className="home-main">
          <AnnouncementBanner semester={semester} />
          <h1 className="home-title">{firstName ? `Hey ${firstName}, pick a deck.` : 'Pick a deck.'}</h1>
          <p className="home-sub">
            Semester {semester} subjects. Each one has study, practice and exam modes, plus
            flashcards and a weekly leaderboard.
          </p>

          {resumable.length ? (
            <section className="resume" aria-labelledby="resume-title">
              <h2 id="resume-title" className="section-title">Pick up where you left off</h2>
              <div className="resume-list">
                {resumable.map((s) => (
                  <Link key={s.key} to={`${s.to}/${progress[s.key].resumeMode}`} className="resume-link" {...intent(s.key)}>
                    <span className="resume-subject">{s.name}</span>
                    <span className="resume-mode">{RESUME_LABEL[progress[s.key].resumeMode] || 'In progress'}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div className="decks">
            {subjects.map((s, i) => {
              const p = progress[s.key];
              const n = counts[s.key];
              return (
                <Link key={s.key} to={s.to} className={'deck fill-' + s.fill} {...intent(s.key)}
                      style={{ '--tilt': TILTS[i % TILTS.length] + 'deg', '--i': i }}>
                  <span className="deck-glyph" aria-hidden="true">{s.glyph}</span>
                  <span className="deck-name">{s.name}</span>
                  <span className="deck-meta">
                    <span className="deck-count">
                      {n == null ? ' ' : n === 0 ? 'Coming soon' : `${n.toLocaleString()} questions`}
                    </span>
                    {p?.wrongCount ? <span className="deck-review">{p.wrongCount} to review</span> : null}
                  </span>
                  <MiniSheet scores={log.recent[s.key] || []} />
                  <ul className="deck-topics">
                    {s.topics.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                  <span className="deck-go" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
