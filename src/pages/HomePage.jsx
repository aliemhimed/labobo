import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSubjectSummary } from '../lib/storage.js';
import { fetchQuestionCounts } from '../lib/questions.js';
import { toggleTheme } from '../lib/theme.js';
import { useAuth } from '../lib/auth.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { SunIcon, MoonIcon } from '../components/ThemeIcons.jsx';
import ProfileMenu from '../components/ProfileMenu.jsx';
import { SUBJECTS, MIDTERM } from '../lib/subjects.js';

const MedArtIcon = () => (
  /* Paintbrush + stethoscope: the arms form a Y at the top, the tube curves
     down into a brush handle with the ferrule and bristles bottom-right. */
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round">
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

// One glyph per storagePrefix — the color scheme for each lives in home.css
// under the same name (.subject-card.<prefix>).
const ICONS = {
  gct: '🧬', bs: '🫀', chem: '⚗️', phys: '⚡', clin: '💉', medart: <MedArtIcon />,
  gct2: '🧬', bs2: '🫀', clin2: '💉', medart2: <MedArtIcon />,
  midterm: '🎓',
};

const RESUME_LABEL = { practice: 'Practice', exam: 'Exam', 'review-wrong': 'Review Wrong Answers' };

// Cards are built from the subject registry so this list can't drift from
// what the subject pages actually offer, then filtered to the signed-in
// user's semester. Midterm Review is bolted on: it's a separate page rather
// than a SUBJECTS entry, and counts as Semester 1.
const ALL_CARDS = [
  ...Object.entries(SUBJECTS).map(([key, cfg]) => ({
    key,
    to: `/${key}`,
    cls: cfg.storagePrefix,
    icon: ICONS[cfg.storagePrefix],
    name: cfg.title.replace(/ MCQ$/, ''),
    desc: cfg.description,
    sources: cfg.sources,
    storagePrefix: cfg.storagePrefix,
    semester: cfg.semester,
  })),
  {
    key: 'midterm',
    to: '/midterm-review',
    cls: 'midterm',
    icon: ICONS.midterm,
    name: MIDTERM.title,
    desc: MIDTERM.description,
    sources: MIDTERM.sources,
    storagePrefix: MIDTERM.storagePrefix,
    semester: MIDTERM.semester,
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [counts, setCounts] = useState({});
  const [progress, setProgress] = useState({});

  const cards = ALL_CARDS.filter((c) => c.semester === profile?.semester);

  useEffect(() => { document.title = 'Studywith Labobo'; }, []);

  // Progress is a handful of synchronous localStorage reads — cheap enough
  // to just do on mount, and this page remounts fresh on every visit anyway.
  useEffect(() => {
    setProgress(Object.fromEntries(cards.map((c) => [c.key, getSubjectSummary(c.storagePrefix)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.semester]);

  // Counts come from Supabase directly (see fetchQuestionCounts) and can be
  // slow on a cold connection, so they fill in after the grid is already usable.
  useEffect(() => {
    let cancelled = false;
    Promise.all(cards.map(async (c) => [c.key, await fetchQuestionCounts(c.sources)]))
      .then((entries) => { if (!cancelled) setCounts(Object.fromEntries(entries)); })
      .catch(() => { /* counts are a nice-to-have; the cards work without them */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.semester]);

  const displayName = profile?.username || user?.user_metadata?.full_name || user?.email || '';
  const greeting = displayName ? `Hey ${displayName.split(' ')[0]}, pick your subject 👇` : 'Choose your subject';
  const resumable = cards.filter((c) => progress[c.key]?.resumeMode);

  return (
    <>
      <div className="home-actions">
        <button className="theme-toggle" title="Toggle theme" aria-label="Toggle theme" onClick={toggleTheme}>
          <SunIcon className="icon-sun" />
          <MoonIcon className="icon-moon" />
        </button>
        <ProfileMenu />
      </div>

      <div className="wrap">
        <div className="brand">
          <img src="/theme/app-icon.webp" className="brand-icon" alt="Labobo" width="68" height="68" />
          <div className="brand-words">
            <span className="brand-name">Studywith Labobo</span>
            <span className="brand-tagline">Study smart. Stay ahead. Ace together.</span>
          </div>
        </div>

        <div className="subject-wrap visible">
          <div className="subject-greeting">{greeting}</div>
          <p className="subject-sub">Select what you want to study today</p>

          {resumable.length ? (
            <div className="resume-row" aria-label="Continue where you left off">
              <span className="resume-label">Continue:</span>
              {resumable.map((c) => (
                <Link key={c.key} to={`${c.to}/${progress[c.key].resumeMode}`} className="resume-chip">
                  {c.name} · {RESUME_LABEL[progress[c.key].resumeMode] || 'Resume'}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="subject-grid">
            {cards.map((c) => {
              const p = progress[c.key];
              const empty = counts[c.key] === 0;
              return (
                <Link key={c.key} to={c.to} className={'subject-card ' + c.cls}>
                  <div className="subject-icon">{c.icon}</div>
                  <div className="subject-name">{c.name}</div>
                  <div className="subject-desc">{c.desc}</div>
                  <div className="subject-meta">
                    {counts[c.key] != null ? <span>{counts[c.key]} questions</span> : null}
                    {p?.sessionsCount ? <span> · Last {p.lastScore}%</span> : null}
                  </div>
                  {empty ? <div className="subject-badge soon">Coming soon</div>
                         : p?.wrongCount ? <div className="subject-badge">{p.wrongCount} to review</div> : null}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
