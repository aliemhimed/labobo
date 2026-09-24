import PageHead from '../components/PageHead.jsx';
import { distribute } from '../lib/utils.js';

const LEADERBOARD_LENGTH = 30;

export default function ConfigView({ config, mode, examLength, setExamLength, onStart, onHome }) {
  const isExam = mode === 'exam';
  const subjects = Object.keys(config.ratio);
  const split = subjects.length > 1
    ? Object.entries(distribute(examLength, config.ratio)).map(([s, n]) => `${s} ${n}`).join(', ')
    : '';

  return (
    <div className="container narrow">
      <PageHead backLabel={config.title.replace(/ MCQ$/, '')} onBack={onHome}
                title={isExam ? 'Exam' : 'Practice set'} />
      <p className="lede">
        {isExam
          ? 'Answers and explanations stay hidden until you submit. There is no timer, you can move freely between questions, and an answer can’t be changed once chosen.'
          : 'You see the answer and explanation after every question. There is no timer, and your score is saved to your history.'}
      </p>

      <fieldset className="count-picker">
        <legend>Number of questions</legend>
        <div className="count-bubbles">
          {config.examLengths.map((n) => (
            <button type="button" key={n} className="count-bubble"
                    aria-pressed={n === examLength} onClick={() => setExamLength(n)}>
              {n}
            </button>
          ))}
        </div>
        {split ? <p className="config-note">Split by subject: {split}.</p> : null}
        {isExam && examLength === LEADERBOARD_LENGTH ? (
          <p className="config-note">A {LEADERBOARD_LENGTH}-question exam counts toward the weekly leaderboard.</p>
        ) : null}
      </fieldset>

      <button type="button" className="btn primary lg config-start" onClick={onStart}>
        {isExam ? 'Start exam' : 'Start practice'}
      </button>
    </div>
  );
}
