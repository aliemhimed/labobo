import { displaySrc } from '../lib/questions.js';
import { Flag } from '../components/Icons.jsx';

/* If a display copy is missing (an image added without re-running
   scripts/optimize_images.py), fall back to the full-size file once. */
function fallBackToOriginal(e) {
  const img = e.currentTarget;
  const original = img.dataset.original;
  if (original && img.getAttribute('src') !== original) img.src = original;
}

/* The top of a question, shared by the live quiz and the post-exam review:
   where it comes from, the report button, the question and any images.
   The bank name is shown only when it adds something to the page title
   (GCT's Biochemistry, Genetics…), not when it repeats it. */
export default function QuestionBody({ question, onReport, subjectTitle = '' }) {
  const showSubject = question.subject && !subjectTitle.startsWith(question.subject);
  return (
    <>
      <div className="q-head">
        <p className="q-source">
          {showSubject ? <span className="q-subject">{question.subject}</span> : null}
          <span className="q-topic">{question.topic}</span>
        </p>
        <button type="button" className="report-btn" onClick={onReport}>
          <Flag />Report a problem
        </button>
      </div>

      <p className="q-text">{question.q}</p>

      {question.images?.length ? (
        <div className="q-images">
          {question.images.map((src, n) => (
            <a key={src} className="q-image-link" href={src} target="_blank" rel="noreferrer">
              <img src={displaySrc(src)} data-original={src} onError={fallBackToOriginal}
                   alt={`Image ${n + 1} for this question`} loading="lazy" decoding="async" />
            </a>
          ))}
        </div>
      ) : null}
    </>
  );
}
