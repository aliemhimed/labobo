import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ModeHome from '../quiz/ModeHome.jsx';
import { GuideReader, GuidesLibrary } from '../quiz/Guides.jsx';
import { CATALOG_QUERY } from '../lib/guides.js';
import '../styles/quiz.css';

/* Development only (/dev/guides): the real study-guide screens of GCT I
   without signing in or the server functions. App.jsx only adds this route
   in `vite dev`, so this module (and the guide text it pulls in) is not in
   the built site. "Free plan" shows what a student without a pass sees: the
   first two lectures of each part open, the rest locked. The guide list is
   study-guides/preview/guides.json: run `node study-guides/publish.cjs --dry`
   to write it. */

const SOURCES = import.meta.glob('../../study-guides/gct/**/*.html', { query: '?raw', import: 'default', eager: true });
const IMAGES = import.meta.glob('../../study-guides/img/**/*.{jpg,png}', { query: '?url', import: 'default', eager: true });
// Absent until publish.cjs has run once; the page then shows no guides.
const LIST = Object.values(import.meta.glob('../../study-guides/preview/guides.json', { import: 'default', eager: true }))[0] || {};
const isFree = (path) => /\/(wk|lec)0[12]-/.test(path);

export default function DevGuidesPreview() {
  const [view, setView] = useState({ name: 'home' });
  const [plan, setPlan] = useState('free');
  const read = (g) => { setView({ name: 'guide', folder: g.folder, slug: g.slug }); window.scrollTo(0, 0); };
  // Stand in for /api/guide?catalog=1 before the screens ask for it.
  const queryClient = useQueryClient();
  useState(() => queryClient.setQueryData(CATALOG_QUERY, LIST));

  const loadAccess = async (subject) => (
    Object.fromEntries((LIST[subject]?.guides || []).map((g) => [g.path, plan === 'pass' || isFree(g.path)]))
  );
  const loadHtml = async (subject, guide) => {
    if (plan !== 'pass' && !isFree(guide.path)) {
      throw Object.assign(new Error('This guide comes with a pass'), { locked: true, status: 403 });
    }
    const html = SOURCES[`../../study-guides/${subject}/${guide.path}.html`] || '';
    return html.replace(/src="\/guides\/img\/([^"]+)"/g, (m, p) => `src="${IMAGES[`../../study-guides/img/${p}`] || ''}"`);
  };

  return (
    <main key={plan}>
      <p style={{ margin: 0, padding: '8px 16px', background: 'var(--fill-yellow)', color: 'var(--card-ink)', fontWeight: 700, textAlign: 'center' }}>
        Preview (dev only).{' '}
        <button type="button" onClick={() => setPlan(plan === 'pass' ? 'free' : 'pass')}>
          {plan === 'pass' ? 'Showing: pass. Switch to free plan' : 'Showing: free plan. Switch to pass'}
        </button>
      </p>
      {view.name === 'home' ? (
        <ModeHome title="GCT I" subjectKey="gct" questionCount={2840} topicCount={64} wrongCount={0} historyCount={0}
                  onGo={(k) => { if (k === 'guides') setView({ name: 'library' }); }} />
      ) : null}
      {view.name === 'library' ? (
        <GuidesLibrary subjectKey="gct" subjectTitle="GCT I" onBack={() => setView({ name: 'home' })} onRead={read}
                       onUnlock={() => alert('Would open the pass window')} loadAccess={loadAccess} />
      ) : null}
      {view.name === 'guide' ? (
        <GuideReader subjectKey="gct" subjectTitle="GCT I" folder={view.folder} slug={view.slug}
                     canPractise={plan === 'pass' || isFree(`/${view.slug}`)}
                     onPractise={() => {}} onUnlock={() => alert('Would open the pass window')}
                     onBack={() => setView({ name: 'library' })} onRead={read} loadHtml={loadHtml} />
      ) : null}
    </main>
  );
}
