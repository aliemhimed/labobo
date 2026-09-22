import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import SelectSemesterPage from './pages/SelectSemesterPage.jsx';
import NotFound from './pages/NotFound.jsx';
import AnnouncementBanner from './components/AnnouncementBanner.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthGate, SemesterGate } from './components/AuthGate.jsx';
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
      <Routes>
        {/* Admin keeps its own separate staff password gate — it is not part
            of the student sign-in flow below. */}
        <Route path="/admin" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
        <Route path="/*" element={<StudentApp />} />
      </Routes>
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
            <Route path="/midterm-review" element={<MidtermPage />} />
            {Object.entries(LEGACY).map(([from, to]) => (
              <Route key={from} path={from} element={<Navigate to={to} replace />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <AnnouncementBanner />
      </SemesterGate>
    </AuthGate>
  );
}
