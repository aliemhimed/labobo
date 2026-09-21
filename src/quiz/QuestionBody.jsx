/* The top of a question card, shared by the live quiz and the post-exam
   review: subject/topic line, report button, question text and any images. */
export default function QuestionBody({ question, index, onReport }) {
  return (
    <>
      <div className="q-meta">
        <span>{question.subject} · {question.topic}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="q-tag">Q{index + 1}</span>
          <button className="report-btn" title="Report a problem" onClick={onReport}>🚩 Report</button>
        </div>
      </div>

      <div className="q-text">{question.q}</div>

      {question.images?.length ? (
        <div className="q-images">
          {question.images.map((src, n) => (
            <a key={src} className="q-image-link" href={src} target="_blank" rel="noreferrer">
              <img src={src} alt={`Image ${n + 1} for this question`} loading="lazy" decoding="async" />
            </a>
          ))}
        </div>
      ) : null}
    </>
  );
}
