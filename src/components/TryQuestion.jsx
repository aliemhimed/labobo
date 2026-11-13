import { useState } from 'react';

/* The front page's centrepiece: three real questions from free lectures
   that a visitor can answer before signing in, with Labobo standing on the
   card and reacting. Copied from the question banks on purpose, so the page
   needs no request to show them; swap them here if a bank changes. */
const SAMPLES = [
  {
    from: 'GCT II, Biochemistry: Glycolysis',
    q: 'Which cells always depend on glycolysis for ATP production?',
    options: ['Hepatocytes', 'Red blood cells', 'Cardiac myocytes', 'Skeletal muscle fibres'],
    answer: 1,
    explanation: 'Red blood cells lack mitochondria and depend entirely on glycolysis for ATP (glial cells of the brain are the other example given).',
  },
  {
    from: 'Body Systems II, Anatomy: Cardiovascular System',
    q: 'Which of the following is a large elastic artery?',
    options: ['Femoral artery', 'Axillary artery', 'Pulmonary trunk', 'Radial artery'],
    answer: 2,
    explanation: 'Large elastic arteries include the aorta, brachiocephalic trunk, left common carotid, left subclavian and the pulmonary trunk. The femoral, axillary and radial arteries are medium muscular arteries.',
  },
  {
    from: 'GCT IV, Microbiology: Basics of Microbiology',
    q: 'India ink is classically used to demonstrate the capsule of which organism?',
    options: ['Mycobacterium', 'Mycoplasma', 'Treponema', 'Cryptococcus'],
    answer: 3,
    explanation: 'India ink negative staining outlines the capsule of Cryptococcus.',
  },
];

const LETTERS = ['A', 'B', 'C', 'D'];

export default function TryQuestion({ onSignIn }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [hop, setHop] = useState(0);
  const [score, setScore] = useState(0);

  const sample = SAMPLES[index];
  const answered = picked !== null;
  const right = picked === sample.answer;
  const last = index === SAMPLES.length - 1;

  function pick(n) {
    if (answered) return;
    setPicked(n);
    setHop((h) => h + 1);
    if (n === sample.answer) setScore((s) => s + 1);
  }

  function next() {
    setPicked(null);
    setIndex((i) => i + 1);
  }

  let say = 'Try one. No sign-in needed.';
  if (answered && last) say = `${score} of ${SAMPLES.length}. Sign in and I'll keep your score next time.`;
  else if (answered) say = right ? 'Correct. One more?' : 'Not this time. The explanation is under the answers.';
  else if (index > 0) say = `Question ${index + 1} of ${SAMPLES.length}.`;

  return (
    <div className="try">
      <div className="try-labobo">
        <span className="try-bob">
          <img key={hop} className={hop ? 'hop' : ''} src="/theme/mascot-lg.webp" alt="" width="400" height="732" draggable="false" />
        </span>
        <p className="say" role="status">{say}</p>
      </div>

      <article key={index} className="try-card" aria-label="Sample question">
        <p className="try-from">{sample.from}</p>
        <h2 className="try-q">{sample.q}</h2>
        <div className="try-options" role="group" aria-label="Answers">
          {sample.options.map((option, n) => {
            let state = '';
            if (answered) state = n === sample.answer ? ' correct' : n === picked ? ' wrong' : ' dim';
            return (
              <button key={option} type="button" className={'try-option' + state} style={{ '--n': n }}
                      aria-disabled={answered} onClick={() => pick(n)}>
                <span className="try-letter" aria-hidden="true">{LETTERS[n]}</span>
                <span>{option}</span>
                {answered && n === sample.answer ? <span className="try-mark">Correct answer</span> : null}
                {answered && n === picked && !right ? <span className="try-mark">Your answer</span> : null}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div className="try-after">
            <p className="try-why">{sample.explanation}</p>
            {last ? (
              <button type="button" className="btn primary" onClick={onSignIn}>Sign in for the rest</button>
            ) : (
              <button type="button" className="btn" onClick={next}>Try another</button>
            )}
          </div>
        ) : null}
      </article>
    </div>
  );
}
