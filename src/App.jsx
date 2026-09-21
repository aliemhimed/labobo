import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import NotFound from './pages/NotFound.jsx';
const SubjectPage = lazy(() => import('./pages/SubjectPage.jsx'));
const MidtermPage = lazy(() => import('./pages/MidtermPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
import { SUBJECTS } from './lib/subjects.js';

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
    <Suspense fallback={null}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      {Object.keys(SUBJECTS).map((key) => (
        <Route key={key} path={`/${key}`} element={<SubjectPage subjectKey={key} />} />
      ))}
      <Route path="/midterm-review" element={<MidtermPage />} />
      <Route path="/admin" element={<AdminPage />} />
      {Object.entries(LEGACY).map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
