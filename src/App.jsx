import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import NotFound from './pages/NotFound.jsx';
import AnnouncementBanner from './components/AnnouncementBanner.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { SUBJECTS } from './lib/subjects.js';

const SubjectPage = lazy(() => import('./pages/SubjectPage.jsx'));
const MidtermPage = lazy(() => import('./pages/MidtermPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));

/* The old site was a folder of .html files. Keep those URLs working so
   existing links and bookmarks don't break. */
const LEGACY = {
  '/index.html': '/',
  '/midterm-review.html': '/midterm-review',
  '/admin.html': '/admin',
  ...Object.fromEntries(Object.keys(SUBJECTS).map((k) => [`/${k}.html`, `/${k}`])),
};

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* The trailing /* carries the quiz view (/gct/exam, /gct/dashboard…). */}
          {Object.keys(SUBJECTS).map((key) => (
            <Route key={key} path={`/${key}/*`} element={<SubjectPage subjectKey={key} />} />
          ))}
          <Route path="/midterm-review" element={<MidtermPage />} />
          <Route path="/admin" element={<AdminPage />} />
          {Object.entries(LEGACY).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <AnnouncementBanner />
    </ErrorBoundary>
  );
}
