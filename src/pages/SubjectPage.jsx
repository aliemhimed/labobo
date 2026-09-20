import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import QuizEngine from '../quiz/QuizEngine.jsx';
import TopBar from '../components/TopBar.jsx';
import { ToastProvider } from '../components/Toast.jsx';
import { useQuestions } from '../hooks/useQuestions.js';
import { getSubject } from '../lib/subjects.js';

function Shell({ config, children }) {
  return (
    <>
      <TopBar subtitle={config.title.replace(/ MCQ$/, '')} user={null} />
      <div id="root">{children}</div>
    </>
  );
}

export default function SubjectPage({ subjectKey }) {
  const config = getSubject(subjectKey);
  const { questions, status, error, reload } = useQuestions(config);

  useEffect(() => {
    if (config) document.title = config.docTitle;
  }, [config]);

  if (!config) return <p>Unknown subject.</p>;

  if (status === 'loading') {
    return (
      <Shell config={config}>
        <div className="container center-wrap">
          <div className="card" style={{ textAlign: 'center', padding: 34 }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>📚</div>
            <h2>Loading questions…</h2>
            <p style={{ color: 'var(--text-soft)' }}>Fetching the {config.title} bank.</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell config={config}>
        <div className="container center-wrap">
          <div className="card" style={{ textAlign: 'center', padding: 34 }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>⚠️</div>
            <h2>Couldn't load the questions</h2>
            <p style={{ color: 'var(--text-soft)' }}>
              {String(error?.message || error)}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn primary" onClick={reload}>Try again</button>
              <Link className="btn ghost" to="/">All subjects</Link>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (status === 'empty') {
    return (
      <Shell config={config}>
        <div className="container center-wrap">
          <div className="card" style={{ textAlign: 'center', padding: 34 }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🗃️</div>
            <h2>No questions yet</h2>
            <p style={{ color: 'var(--text-soft)' }}>
              The {config.title} bank is empty. Add rows to{' '}
              {config.sources.map((s) => s.table).join(', ')} in Supabase and they'll show up here —
              no redeploy needed.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn" onClick={reload}>Check again</button>
              <Link className="btn ghost" to="/">All subjects</Link>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <ToastProvider>
      <QuizEngine config={config} questions={questions} />
    </ToastProvider>
  );
}
