import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import SubjectPage from './pages/SubjectPage.jsx';
import MidtermPage from './pages/MidtermPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import NotFound from './pages/NotFound.jsx';
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
  );
}
