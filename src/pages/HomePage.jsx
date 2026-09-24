import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubjectSummary } from '../lib/storage.js';
import { fetchTableCounts } from '../lib/questions.js';
import { useProfile } from '../hooks/useProfile.js';
import { ThemeToggle } from '../components/ThemeIcons.jsx';
import ProfileMenu from '../components/ProfileMenu.jsx';
import { SUBJECTS } from '../lib/subjects.js';
import { questionsQuery } from '../hooks/useQuestions.js';
import { loadSubjectPage } from './loadSubjectPage.js';

const RESUME_LABEL = {
  practice: 'Practice in progress',
  exam: 'Exam in progress',
  'review-wrong': 'Wrong-answer review in progress',
};

// Built from the subject registry so this list can't drift from what the
// subject pages actually offer, then filtered to the user's semester.
const ALL_SUBJECTS = Object.entries(SUBJECTS).map(([key, cfg]) => ({
  key,
  to: `/${key}`,
  name: cfg.title.replace(/ MCQ$/, ''),
  desc: cfg.description,
  sources: cfg.sources,
  storagePrefix: cfg.storagePrefix,
  semester: cfg.semester,
}));

export default function HomePage() {
  const { data: profile } = useProfile();
  const [progress, setProgress] = useState({});

  const semester = profile?.semester;
  const subjects = ALL_SUBJECTS.filter((s) => s.semester === semester);

  useEffect(() => { document.title = 'Studywith Labobo'; }, []);

  // Every row leads to the subject page, so fetch its code once the home
  // page has settled rather than after the click.
  useEffect(() => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => { loadSubjectPage().catch(() => { /* the route retries on click */ }); });
    return () => cancel(id);
  }, []);

  // Start downloading a subject's bank as soon as its row is hovered, focused
  // or touched; the subject page then usually finds it already cached.
  const queryClient = useQueryClient();
  const prefetch = (key) => () => { queryClient.prefetchQuery(questionsQuery(SUBJECTS[key])); };
  const intent = (key) => ({ onPointerEnter: prefetch(key), onFocus: prefetch(key), onTouchStart: prefetch(key) });

  // Progress is a handful of synchronous localStorage reads — cheap enough
  // to just do on mount, and this page remounts fresh on every visit anyway.
  useEffect(() => {
    setProgress(Object.fromEntries(subjects.map((s) => [s.key, getSubjectSummary(s.storagePrefix)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester]);

  // One request for every table on the page, cached for a few minutes so
  // coming back to the home page shows the counts straight away. They fill in
  // after the list is already usable either way.
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

  return (
    <>
      <header className="appbar">
        <span className="wordmark">Labobo</span>
        <div className="appbar-actions">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>

      <main className="home">
        <h1>Semester {semester}</h1>

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

        <h2 className="section-title contents-title">Subjects</h2>
        <ul className="contents">
          {subjects.map((s) => {
            const p = progress[s.key];
            const n = counts[s.key];
            return (
              <li key={s.key}>
                <Link to={s.to} className="contents-row" {...intent(s.key)}>
                  <span className="cr-name">{s.name}</span>
                  <span className="cr-count">
                    {n == null ? '' : n === 0 ? 'Coming soon' : `${n.toLocaleString()} questions`}
                  </span>
                  <span className="cr-desc">{s.desc}</span>
                  <span className="cr-progress">
                    {p?.sessionsCount ? <span>Last score {p.lastScore}%</span> : null}
                    {p?.wrongCount ? <span className="cr-review">{p.wrongCount} to review</span> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
