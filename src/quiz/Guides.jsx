import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from '../components/Icons.jsx';
import PageHead from '../components/PageHead.jsx';
import { fetchGuide, fetchGuideAccess, findGuide, guidesFor, rememberGuide, useGuideCatalog } from '../lib/guides.js';
import { useAuth } from '../lib/auth.jsx';
import '../../study-guides/lb-guide.css';
import '../styles/guides.css';

/* A subject's study guides: the card on the subject's start screen, the
   list (one tab per part), and the guide itself. The list comes from the
   server too (useGuideCatalog). The server decides who may
   read which guide (netlify/functions/guide.js): the free lectures for
   everyone, the rest with a pass or trial. `loadHtml` and `loadAccess`
   replace the server calls in the dev-only preview page. */

const Lock = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

/** { "<path>": open? } for this student, or {} while loading or if it fails (the reader still checks). */
function useGuideAccess(subjectKey, loadAccess) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['guide-access', subjectKey, user?.id],
    queryFn: ({ signal }) => (loadAccess || fetchGuideAccess)(subjectKey, signal),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return data || {};
}

const PART_ICON = { Biochemistry: '⚗️', 'Medical Genetics': '🧬', 'Molecular Biology': '🔬', Histology: '🩻' };

/** The wide card above Study / Practice / Exam. Nothing for a subject without guides. */
export function GuidesCard({ subjectKey, onOpen }) {
  const m = guidesFor(useGuideCatalog().catalog, subjectKey);
  if (!m) return null;
  const videos = m.guides.reduce((n, g) => n + g.videos, 0);
  return (
    <section aria-labelledby="learn-title" className="learn-section">
      <h2 id="learn-title" className="section-title">Learn the lectures</h2>
      <button type="button" className="guides-card fill-blue" onClick={onOpen}>
        <span className="mode-icon" aria-hidden="true">📖</span>
        <span className="guides-card-text">
          <span className="mode-name">Study guides</span>
          <span className="mode-desc">
            Every lecture {m.note} explained step by step, with pictures and short videos placed where they help
            {m.guides.some((g) => g.quiz) ? ', and a quick quiz at the end.' : ', then its questions to practise.'}
          </span>
          <span className="guides-card-meta">{m.guides.length} guides · {videos} videos</span>
        </span>
        <ChevronRight />
      </button>
    </section>
  );
}

/** All guides of a subject, one tab per part. */
export function GuidesLibrary({ subjectKey, subjectTitle, onBack, onRead, onUnlock, loadAccess }) {
  const { catalog, loading } = useGuideCatalog();
  const m = guidesFor(catalog, subjectKey);
  const open = useGuideAccess(subjectKey, loadAccess);
  const lockedCount = m ? m.guides.filter((g) => open[g.path] === false).length : 0;
  const [part, setPart] = useState(() => {
    try { return sessionStorage.getItem(`labobo-guides-part:${subjectKey}`); } catch { return null; }
  });
  if (!m) {
    return (
      <div className="container">
        <PageHead backLabel={subjectTitle} onBack={onBack} title="Study guides" />
        <p className="guide-loading" role="status">{loading ? 'Loading the guides…' : 'There are no study guides for this subject yet.'}</p>
      </div>
    );
  }
  const shown = m.parts.includes(part) ? part : m.parts[0];
  const choose = (p) => {
    setPart(p);
    try { sessionStorage.setItem(`labobo-guides-part:${subjectKey}`, p); } catch { /* remembered for this visit only */ }
  };
  return (
    <div className="container">
      <PageHead backLabel={subjectTitle} onBack={onBack} title="Study guides" />
      <p className="guides-intro">
        Read a lecture, watch the clips inside it, then practise its questions. Guides for the lectures {m.note} are
        here now; the rest are on the way.
      </p>
      {lockedCount ? (
        <div className="guides-locked-note">
          <p>The first two lectures of each part are free. The other {lockedCount} guides come with a pass.</p>
          <button type="button" className="btn sm primary" onClick={onUnlock}>Unlock everything</button>
        </div>
      ) : null}

      <div className="guides-tabs" role="tablist" aria-label="Part">
        {m.parts.map((p) => (
          <button key={p} type="button" role="tab" className="scope-chip"
                  aria-selected={p === shown} aria-pressed={p === shown} onClick={() => choose(p)}>
            <span aria-hidden="true">{PART_ICON[p]}</span> {p}{' '}
            <span className="guides-tab-n">{m.guides.filter((g) => g.part === p).length}</span>
          </button>
        ))}
      </div>

      <ul className="guides-list">
        {m.guides.filter((g) => g.part === shown).map((g) => {
          const locked = open[g.path] === false;
          return (
          <li key={g.path}>
            <button type="button" className={'guide-row' + (locked ? ' is-locked' : '')}
                    onClick={() => (locked ? onUnlock() : onRead(g))}
                    aria-label={locked ? `${g.label}: ${g.title}, locked. Unlock with a pass` : undefined}>
              <span className="guide-row-label">{locked ? <Lock /> : null}{g.label}</span>
              <span className="guide-row-text">
                <span className="guide-row-title">{g.title}</span>
                <span className="guide-row-meta">
                  {g.minutes} min read
                  {g.pictures ? ` · ${g.pictures} picture${g.pictures > 1 ? 's' : ''}` : ''}
                  {g.videos ? ` · ${g.videos} video${g.videos > 1 ? 's' : ''}` : ''}
                  {g.quiz ? ` · ${g.quiz} quiz questions` : ''}
                </span>
              </span>
              <ChevronRight />
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One guide. `practiseKeys` are the guide's lectures that the student can
    practise now (open, not locked); with none, the button offers the pass. */
export function GuideReader({ subjectKey, subjectTitle, folder, slug, canPractise, onPractise, onUnlock, onBack, onRead, loadHtml }) {
  const { catalog, loading: listLoading } = useGuideCatalog();
  const guide = findGuide(catalog, subjectKey, folder, slug);
  const location = useLocation();
  const { user } = useAuth();
  const { data: html, error, isLoading, refetch } = useQuery({
    queryKey: ['guide', subjectKey, folder, slug, user?.id],
    enabled: !!guide,
    queryFn: ({ signal }) => (loadHtml || fetchGuide)(subjectKey, guide, signal),
    staleTime: 30 * 60_000,
    retry: (n, e) => !e?.locked && n < 1,
  });

  // Start at the top of a new guide, or where the student stopped when they
  // came back through "Continue reading".
  const restored = useRef(null);
  useEffect(() => {
    if (!html || restored.current === `${folder}/${slug}`) return;
    restored.current = `${folder}/${slug}`;
    const y = location.state?.resumeY;
    if (location.hash) {
      document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
    } else {
      window.scrollTo(0, typeof y === 'number' ? y : 0);
    }
  }, [html, folder, slug, location.state, location.hash]);

  // Remember this guide, and how far down the student is, for "Continue reading".
  useEffect(() => {
    if (!guide) return undefined;
    const save = () => rememberGuide({
      subject: subjectKey, subjectTitle, path: guide.path, title: guide.title, label: guide.label, part: guide.part,
      y: Math.round(window.scrollY),
    });
    save();
    let t = null;
    const onScroll = () => { clearTimeout(t); t = setTimeout(save, 400); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); save(); };
  }, [guide, subjectKey, subjectTitle]);

  if (!guide && listLoading) {
    return (
      <div className="container guide-page">
        <button type="button" className="back-link" onClick={onBack}><ChevronLeft />Study guides</button>
        <p className="guide-loading" role="status">Loading the guide…</p>
      </div>
    );
  }
  if (!guide) {
    return (
      <div className="container">
        <PageHead backLabel="Study guides" onBack={onBack} title="Guide not found" />
        <p>This study guide is not on the site yet.</p>
      </div>
    );
  }

  const m = guidesFor(catalog, subjectKey);
  const list = m.guides.filter((g) => g.part === guide.part);
  const next = list[list.indexOf(guide) + 1] || null;
  const lecture = guide.topics.join(' and ');

  return (
    <div className="container guide-page">
      <button type="button" className="back-link" onClick={onBack}><ChevronLeft />Study guides</button>
      {isLoading ? <p className="guide-loading" role="status">Loading the guide…</p> : null}
      {error?.locked ? (
        <div className="guide-locked" role="status">
          <span className="guide-locked-icon"><Lock /></span>
          <h1>{guide.title}</h1>
          <p className="guide-locked-lede">{guide.lede}</p>
          <p><strong>{error.message}.</strong> The first two lectures of each part are free; a pass opens every guide and all their questions.</p>
          <button type="button" className="btn primary" onClick={onUnlock}>Unlock with a pass</button>
        </div>
      ) : null}
      {error && !error.locked ? (
        <div className="state" role="alert">
          <p>Couldn&rsquo;t load this guide. Check your connection and try again.</p>
          <button type="button" className="btn primary" onClick={() => refetch()}>Try again</button>
        </div>
      ) : null}
      {/* Our own guide from /api/guide (checked by study-guides/build.cjs: no scripts, no outside files). */}
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : null}
      {html ? (
        <aside className="guide-next">
          <h2>Done reading?</h2>
          <p>
            {canPractise
              ? <>Practise the questions from <strong>{lecture}</strong> while it is fresh.</>
              : <>The questions from <strong>{lecture}</strong> come with a pass.</>}
          </p>
          <div className="guide-next-actions">
            {canPractise
              ? <button type="button" className="btn primary" onClick={onPractise}>Practise this lecture</button>
              : <button type="button" className="btn primary" onClick={onUnlock}>Unlock its questions</button>}
            {next ? <button type="button" className="btn" onClick={() => onRead(next)}>Next: {next.title}</button> : null}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
