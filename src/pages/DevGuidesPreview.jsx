import { useState } from 'react';
import ModeHome from '../quiz/ModeHome.jsx';
import { GuideReader, GuidesLibrary } from '../quiz/Guides.jsx';
import '../styles/quiz.css';

/* Development only (/dev/guides): the real study-guide screens of GCT I
   without signing in. App.jsx only adds this route in `vite dev`. Nothing
   here saves or sends anything except "Continue reading" in this browser. */

export default function DevGuidesPreview() {
  const [view, setView] = useState({ name: 'home' });
  const read = (g) => { setView({ name: 'guide', folder: g.folder, slug: g.slug }); window.scrollTo(0, 0); };
  return (
    <main>
      <p style={{ margin: 0, padding: '8px 16px', background: 'var(--fill-yellow)', color: 'var(--card-ink)', fontWeight: 700, textAlign: 'center' }}>
        Preview (dev only): GCT I with the published guides. Buttons that would start a quiz do nothing.
      </p>
      {view.name === 'home' ? (
        <ModeHome title="GCT I" subjectKey="gct" questionCount={2840} topicCount={64} wrongCount={0} historyCount={0}
                  onGo={(k) => { if (k === 'guides') setView({ name: 'library' }); }} />
      ) : null}
      {view.name === 'library' ? (
        <GuidesLibrary subjectKey="gct" subjectTitle="GCT I" onBack={() => setView({ name: 'home' })} onRead={read} />
      ) : null}
      {view.name === 'guide' ? (
        <GuideReader subjectKey="gct" subjectTitle="GCT I" folder={view.folder} slug={view.slug}
                     canPractise={view.slug.startsWith('wk01') || view.slug.startsWith('wk02') || view.slug.startsWith('lec01') || view.slug.startsWith('lec02')}
                     onPractise={() => {}} onUnlock={() => {}}
                     onBack={() => setView({ name: 'library' })} onRead={read} />
      ) : null}
    </main>
  );
}
