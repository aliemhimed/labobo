/* "Why the other options are wrong": one line per wrong option that has a
   note (question.optionNotes, keyed by the option's stored index). The
   student's own wrong pick comes first and is marked. `letterOf(i)` gives
   the letter option i shows under on this screen (the quiz shuffles them). */
export default function OptionNotes({ question, letterOf, picked = null }) {
  const notes = question.optionNotes || {};
  const rows = question.options
    .map((_, i) => i)
    .filter((i) => i !== question.answer && notes[i])
    .sort((a, b) => (a === picked ? -1 : b === picked ? 1 : letterOf(a).localeCompare(letterOf(b))));
  if (!rows.length) return null;
  return (
    <div className="option-notes">
      <p className="option-notes-title">Why the other options are wrong</p>
      <ul>
        {rows.map((i) => (
          <li key={i} className={i === picked ? 'picked' : ''}>
            <b>{letterOf(i)}</b>
            <span>
              {i === picked ? <em>Your answer. </em> : null}
              {notes[i]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
