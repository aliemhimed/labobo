import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import QuizEngine from '../quiz/QuizEngine.jsx';
import TopBar from '../components/TopBar.jsx';
import { ToastProvider } from '../components/Toast.jsx';
import { useQuestions } from '../hooks/useQuestions.js';
import { getSubject } from '../lib/subjects.js';
import '../styles/quiz.css';

function Shell({ config, children }) {
  return (
    <>
      <TopBar subtitle={config.title.replace(/ MCQ$/, '')} />
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
  const name = config.title.replace(/ MCQ$/, '');

  if (status === 'loading') {
    return (
      <Shell config={config}>
        <div className="container">
          <div className="state loading-state" role="status">
            <h1>{name}</h1>
            <p>Loading the questions</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell config={config}>
        <div className="container">
          <div className="state" role="alert">
            <h1>Couldn't load the questions</h1>
            <p>Check your connection and try again. ({String(error?.message || error)})</p>
            <div className="state-actions">
              <button className="btn primary" onClick={reload}>Try again</button>
              <Link className="btn" to="/">All subjects</Link>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (status === 'empty') {
    return (
      <Shell config={config}>
        <div className="container">
          <div className="state empty-bank">
            <img src="/theme/mascot.webp" alt="" width="64" height="96" />
            <h1>{name} is coming soon</h1>
            <p>Questions for this subject haven’t been added yet. They’ll appear here as soon as they are.</p>
            <div className="state-actions">
              <Link className="btn primary" to="/">All subjects</Link>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <ToastProvider>
      <QuizEngine config={config} questions={questions} basePath={`/${subjectKey}`} />
    </ToastProvider>
  );
}
