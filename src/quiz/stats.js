/* Live counters shown above the question card in non-exam modes. */
export function quizStats(answers, qIds, questions) {
  let correct = 0, wrong = 0, answered = 0;
  answers.forEach((a, i) => {
    if (!a || a.selected === null) return;
    answered++;
    const q = questions[qIds[i]];
    if (q && a.selected === q.answer) correct++;
    else wrong++;
  });
  return {
    correct,
    wrong,
    answered,
    accuracy: answered > 0 ? Math.round((100 * correct) / answered) : null,
  };
}
