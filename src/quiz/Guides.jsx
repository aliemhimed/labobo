import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from '../components/Icons.jsx';
import PageHead from '../components/PageHead.jsx';
import { fetchGuide, findGuide, guidesFor, rememberGuide } from '../lib/guides.js';
import '../../study-guides/lb-guide.css';
import '../styles/guides.css';

/* A subject's study guides: the card on the subject's start screen, the
   list (one tab per part), and the guide itself. The guides are static
   files written by study-guides/publish.cjs; this only shows them. */

const PART_ICON = { Biochemistry: '⚗️', 'Medical Genetics': '🧬', 'Molecular Biology': '🔬', Histology: '🩻' };

/** The wide card above Study / Practice / Exam. Nothing for a subject without guides. */
export function GuidesCard({ subjectKey, onOpen }) {
  const m = guidesFor(subjectKey);
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
            Every lecture {m.note} explained slide by slide, with pictures, short videos placed where they help,
            and a quick quiz at the end.
          </span>
          <span className="guides-card-meta">{m.guides.length} guides · {videos} videos</span>
        </span>
        <ChevronRight />
      </button>
    </section>
  );
}

/** All guides of a subject, one tab per part. */
export function GuidesLibrary({ subjectKey, subjectTitle, onBack, onRead }) {
  const m = guidesFor(subjectKey);
  const [part, setPart] = useState(() => {
    try { return sessionStorage.getItem(`labobo-guides-part:${subjectKey}`) || m?.parts[0]; } catch { return m?.parts[0]; }
  });
  if (!m) return null;
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
        {m.guides.filter((g) => g.part === shown).map((g) => (
          <li key={g.path}>
            <button type="button" className="guide-row" onClick={() => onRead(g)}>
              <span className="guide-row-label">{g.label}</span>
              <span className="guide-row-text">
                <span className="guide-row-title">{g.title}</span>
                <span className="guide-row-meta">
                  {g.minutes} min read
                  {g.pictures ? ` · ${g.pictures} picture${g.pictures > 1 ? 's' : ''}` : ''}
                  {g.videos ? ` · ${g.videos} video${g.videos > 1 ? 's' : ''}` : ''}
                  {` · ${g.quiz} quiz questions`}
                </span>
              </span>
              <ChevronRight />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One guide. `practiseKeys` are the guide's lectures that the student can
    practise now (open, not locked); with none, the button offers the pass. */
export function GuideReader({ subjectKey, subjectTitle, folder, slug, canPractise, onPractise, onUnlock, onBack, onRead }) {
  const guide = findGuide(subjectKey, folder, slug);
  const location = useLocation();
  const { data: html, error, isLoading, refetch } = useQuery({
    queryKey: ['guide', subjectKey, folder, slug],
    enabled: !!guide,
    queryFn: ({ signal }) => fetchGuide(subjectKey, guide, signal),
    staleTime: Infinity,
    retry: 1,
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

  if (!guide) {
    return (
      <div className="container">
        <PageHead backLabel="Study guides" onBack={onBack} title="Guide not found" />
        <p>This study guide is not on the site yet.</p>
      </div>
    );
  }

  const m = guidesFor(subjectKey);
  const list = m.guides.filter((g) => g.part === guide.part);
  const next = list[list.indexOf(guide) + 1] || null;
  const lecture = guide.topics.join(' and ');

  return (
    <div className="container guide-page">
      <button type="button" className="back-link" onClick={onBack}><ChevronLeft />Study guides</button>
      {isLoading ? <p className="guide-loading" role="status">Loading the guide…</p> : null}
      {error ? (
        <div className="state" role="alert">
          <p>Couldn&rsquo;t load this guide. Check your connection and try again.</p>
          <button type="button" className="btn primary" onClick={() => refetch()}>Try again</button>
        </div>
      ) : null}
      {/* Our own static file from public/guides (checked by study-guides/build.cjs: no scripts, no outside files). */}
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
