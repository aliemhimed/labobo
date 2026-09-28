import { SUBJECTS } from './subjects.js';
import { createSubjectStore } from './storage.js';

const DAY = 86400000;

/* Local calendar day as a number, so "yesterday" is right around midnight
   and across DST changes. */
function dayIndex(date) {
  const d = new Date(date);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
}

/* Reads every subject's saved history and works out the study streak, the
   last seven days, lifetime totals and each subject's last five scores.
   Only finished practice and exam sets are in the history; nothing here
   touches the network. */
export function readStudyLog(now = new Date()) {
  const days = new Set();
  const recent = {};
  let answered = 0;
  let correct = 0;

  Object.entries(SUBJECTS).forEach(([key, s]) => {
    const history = createSubjectStore(s.storagePrefix).getHistory();
    // history is newest first; decks show the last five oldest to newest
    recent[key] = history.slice(0, 5).map((h) => h.score).reverse();
    history.forEach((h) => {
      if (!h || !h.date) return;
      days.add(dayIndex(h.date));
      answered += h.questionCount || 0;
      correct += h.correct || 0;
    });
  });

  const today = dayIndex(now);
  const studiedToday = days.has(today);

  // A streak stays alive until a whole day is missed, so count back from
  // yesterday when today hasn't been studied yet.
  let streak = 0;
  for (let d = studiedToday ? today : today - 1; days.has(d); d--) streak++;

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const idx = today - i;
    const noon = new Date(idx * DAY + 12 * 3600000);
    week.push({
      idx,
      label: noon.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
      date: noon.getUTCDate(),
      done: days.has(idx),
      today: i === 0,
    });
  }

  return {
    streak,
    studiedToday,
    week,
    recent,
    answered,
    accuracy: answered > 0 ? Math.round((100 * correct) / answered) : null,
  };
}
