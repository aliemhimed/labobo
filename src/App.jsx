import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import SelectSemesterPage from './pages/SelectSemesterPage.jsx';
import NotFound from './pages/NotFound.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import HelpButton from './components/HelpButton.jsx';
import { ReviewDialogHost } from './components/Reviews.jsx';
import { SubscribeDialogHost } from './components/Plan.jsx';
import { SettingsDialogHost } from './components/Settings.jsx';
import { AuthGate, SemesterGate } from './components/AuthGate.jsx';
import { SUBJECTS } from './lib/subjects.js';
import { loadSubjectPage } from './pages/loadSubjectPage.js';

const SubjectPage = lazy(loadSubjectPage);
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const TermsPage = lazy(() => import('./pages/TermsPage.jsx'));
const LiveApp = lazy(() => import('./pages/live/LiveApp.jsx'));
// Development only: the subscription screens with made-up data. The built
// site has neither the route nor the page.
const DevPlanPreview = import.meta.env.DEV ? lazy(() => import('./pages/DevPlanPreview.jsx')) : null;
const DevGuidesPreview = import.meta.env.DEV ? lazy(() => import('./pages/DevGuidesPreview.jsx')) : null;
// Labobo Live screens with demo data: in development, or in a build made with VITE_LIVE_DEMO=1.
const DevLivePreview = import.meta.env.DEV || import.meta.env.VITE_LIVE_DEMO === '1' ? lazy(() => import('./pages/DevLivePreview.jsx')) : null;
/* The old site was a folder of .html files. Keep those URLs working so
   existing links and bookmarks don't break. */
const LEGACY = {
  '/index.html': '/',
  ...Object.fromEntries(Object.keys(SUBJECTS).map((k) => [`/${k}.html`, `/${k}`])),
};

export default function App() {
  return (
    <ErrorBoundary>
      <a className="skip-link" href="#main">Skip to content</a>
      <Routes>
        {/* Admins skip the semester gate; the API itself enforces who may see data. */}
        <Route path="/admin" element={<AuthGate><Suspense fallback={null}><AdminPage /></Suspense></AuthGate>} />
        {/* Labobo Live: signed in, no semester needed (teachers have none). */}
        <Route path="/live/*" element={<AuthGate><Suspense fallback={null}><LiveApp /></Suspense></AuthGate>} />
        {/* Public: readable before signing in or paying. */}
        <Route path="/terms" element={<Suspense fallback={null}><TermsPage /></Suspense>} />
        {DevPlanPreview ? <Route path="/dev/plan" element={<Suspense fallback={null}><DevPlanPreview /></Suspense>} /> : null}
        {DevGuidesPreview ? <Route path="/dev/guides" element={<Suspense fallback={null}><DevGuidesPreview /></Suspense>} /> : null}
        {DevLivePreview ? <Route path="/dev/live/*" element={<Suspense fallback={null}><DevLivePreview /></Suspense>} /> : null}        <Route path="/*" element={<StudentApp />} />
      </Routes>
      <InstallPrompt />
      <HelpButton />
    </ErrorBoundary>
  );
}

function StudentApp() {
  return (
    <AuthGate>
      <SemesterGate>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/select-semester" element={<SelectSemesterPage />} />
            {/* The trailing /* carries the quiz view (/gct/exam, /gct/dashboard…). */}
            {Object.keys(SUBJECTS).map((key) => (
              <Route key={key} path={`/${key}/*`} element={<SubjectPage subjectKey={key} />} />
            ))}
            {Object.entries(LEGACY).map(([from, to]) => (
              <Route key={from} path={from} element={<Navigate to={to} replace />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <ReviewDialogHost />
        <SubscribeDialogHost />
        <SettingsDialogHost />
      </SemesterGate>
    </AuthGate>
  );
}
